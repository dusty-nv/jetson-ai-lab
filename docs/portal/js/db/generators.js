/*
 * Templates that generate docker service configs, code examples, docs, ect.
 * for launching containers, jobs, or initiating workflow actions.
 */ 
import {exists, wrapLines, is_list, nonempty} from '../nanolab.js';


/* 
 * config pages for docker, python, javascript, shell 
 */
export function ModelGenerator(args) {
  args.env ??= {pages: {}, properties: {}};

  EnvGenerator(args);
  DockerGenerator(args);
  PythonGenerator(args);
  JavascriptGenerator(args);
  CurlGenerator(args);

  if( !exists(ValidatePages(args)) ) {
    console.log(`Failed to generate valid pages`, args);
    return null;
  }
    
  console.log(`[ConfigGenerator] generated configs for '${args.key}'`, args.env);
  return args.env;
}

/*
 * fold/resolve properties into environment
 */
export function EnvGenerator({db, key, env}) {
  env ??= {pages: {}, properties: {}};

  if( nonempty(db.props[key]) ) {
    for( const field_key of db.props[key] ) {
      env.properties[field_key] = db.flatten({key: key, property: field_key});
      env[field_key] = env.properties[field_key].value;
    }
  }

  console.log('ENV GEN', key, env);
  // using the little cleaner key led to issues with it not lining up with filesystems
  env.model_name ??= get_model_name(env.url); // key; 
  return env;
}

/*
 * docker run + compose
 */
export function DockerGenerator({db, key, env}) {

  if( !db.ancestors[key].includes('container') )
    return env;

  console.log('DockerGenerator', env);

  let opt = env.container_options ?? '';

  if( exists(env.CUDA_VISIBLE_DEVICES) ) {
    const tr = env.CUDA_VISIBLE_DEVICES.trim();
    if( tr.length > 0 )
      opt += ` --gpus ${tr} `;
  }

  if( exists(env.server_host) ) {
    var server_url = new URL('http://' + env.server_host);
    opt += `-p ${server_url.port}:${server_url.port} `;
  }
  else {
    opt += '--network host ';
  }

  if( exists(env.hf_token) ) {
    const tr = env.hf_token.trim();
    if( tr.length > 0 )
      opt += `-e HF_TOKEN=${env.hf_token} `;
  }

  if( exists(env.cache_dir) ) {
    const tr = env.cache_dir.trim();
    if( tr.length > 0 ) {
      var cache_dir = `-v ${tr}:/root/.cache `;
      var hf_hub_dir = `-e HF_HUB_CACHE=/root/.cache/huggingface `;
      opt += cache_dir;
      opt += hf_hub_dir;
    }
  }

  opt = wrapLines(opt) + ' \\\n ';

  const image = `${env.container_image} \\\n   `; 

  let args = ` \\
      --model ${env.model_name} \\
      --quantization ${env.quantization} \\
      --max-batch-size ${env.max_batch_size}`;

  if( exists(env.max_context_len) ) {
    args += ` \\
      --max-context-len ${env.max_context_len}`;
  }

  if( exists(env.prefill_chunk) ) {
    args += ` \\
      --prefill-chunk ${env.prefill_chunk}`;
  }

  if( exists(server_url) ) {
    args += ` \\
      --host ${server_url.hostname} \\
      --port ${server_url.port}`;
  }

  if( exists(env.container_args) ) {
    args += ` \\
        ${env.container_args}`;
  }

  let cmd = env.container_cmd
    .trim()
    .replace('$OPTIONS', '${OPTIONS}')
    .replace('$IMAGE', '${IMAGE}')
    .replace('$ARGS', '${ARGS}');

  if( !cmd.endsWith('${ARGS}') )
    args += ` \\\n      `;  // line break for user args

  cmd = `docker run ${cmd}`
    .replace('${OPTIONS}', opt)
    .replace('${IMAGE}', image)
    .replace('${ARGS}', args)
    .replace('\\ ', '\\')
    .replace('  \\', ' \\');

  /*config.warnings = {
    name: 'warnings',
    lang: 'markdown',
    code: '* ABC123\n** DEF'
  }*/

  env.pages.docker_run = {
    name: 'docker_run',
    lang: 'shell',
    code: cmd
  };

  var compose = composerize(env.pages.docker_run.code, null, 'latest', 2); // this gets imported globally by nanolab.js
  compose = compose.substring(compose.indexOf("\n") + 1); // first line from composerize is an unwanted name
  compose = `# Save as compose.yml and run 'docker compose up'\n` +
    `# For benchmarking, use:  docker compose --profile perf_benchmark up\n` + compose;

  env.pages.docker_compose = {
    name: 'compose',
    lang: 'yaml',
    code: compose
  };

  //
  // Generate alternate docker-compose profiles that support additional tasks/workflows:  
  //
  //    --profile perf_benchmark
  //    --profile acc_benchmark
  //
  let perf_cmd = `docker run -it --rm --network=host `;
  const model_dir = `/root/.cache/mlc_llm/${get_model_repo(env.model_name)}`;

  perf_cmd += `${exists(cache_dir) ? cache_dir : ''} ${exists(hf_hub_dir) ? hf_hub_dir : ''}`;
  perf_cmd += ` ${env.container_image} /bin/bash -c "`;
  perf_cmd += `   python3 -m mlc_llm.bench --dataset sharegpt `;
  perf_cmd += `     --dataset-path $(huggingface-downloader --type dataset anon8231489123/ShareGPT_Vicuna_unfiltered/ShareGPT_V3_unfiltered_cleaned_split.json) `;
  perf_cmd += `     --tokenizer ${model_dir} `;
  perf_cmd += `     --api-endpoint openai --num-requests 25 --num-warmup-requests 2 `;
  perf_cmd += `     --num-concurrent-requests 2 --num-gpus 1 `;
  perf_cmd += `     --host ${exists(server_url) ? server_url.hostname : '0.0.0.0'} `;
  perf_cmd += `     --port ${exists(server_url) ? server_url.port : 9000} `;
  perf_cmd += `     --output ${model_dir}/perf_benchmarks.csv " `;

  var perf_compose = composerize(perf_cmd, null, 'latest', 2);

  for( let n=0; n < 3; n++ )
    perf_compose = perf_compose.substring(perf_compose.indexOf("\n") + 1);

  const perf_pre = `  perf_benchmark:\n    profiles:\n      - perf_benchmark\n` +
    `    depends_on:\n      llm_server:\n        condition: service_started\n`;

  //console.log('PERF CMD', perf_cmd);
  //console.log(`PERF_COMPOSE\n${perf_compose}\nPERF_PRE\n${perf_pre}`);

  env.pages.docker_compose.code = 
    env.pages.docker_compose.code.replace('  mlc:', '  llm_server:') 
    + '\n' + perf_pre + perf_compose;

  return env;
}

const TEST_PROMPT = "Why did the LLM cross the road?";
//const TEST_PROMPT = "You can put multiple chat turns in here.";
//const TEST_PROMPT = "Please tell me about your features as an LLM.";
//const TEST_PROMPT = "Write a limerick about the wonders of GPU computing.";

/*
 * python
 */
export function PythonGenerator({db, key, env}) {

  const max_tokens=exists(env.max_context_len) ? 
        `\n  max_tokens=${env.max_context_len},` : ``;

  const code = 
`from openai import OpenAI

client = OpenAI(
  base_url = 'http://${env.server_host}/v1',
  api_key = "none"
)

chat = [{
  'role': 'user',
  'content': '${TEST_PROMPT}'
}]

completion = client.chat.completions.create(
  model=\'${env.model_name}\',
  messages=chat,${GenerationConfig({db: db, key:key, env:env})}
  stream=True
)

for chunk in completion:
  if chunk.choices[0].delta.content is not None:
    print(chunk.choices[0].delta.content, end='')
`;

  env.pages.python = {
    name: 'python',
    lang: 'python',
    file: 'llm.py',
    code: code,
  };
  
  return env;
}


/*
 * javascript (node)
 */
export function JavascriptGenerator({db, key, env}) {

  const code = 
`import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://${env.server_host}/v1',
  apiKey: 'none',
})

async function main() {
  const completion = await openai.chat.completions.create({
    model: \'${env.model_name}\',
    messages: [{
      'role': 'user',
      'content': "${TEST_PROMPT}"
    }],${GenerationConfig({db: db, key:key, env:env, indent: 4, assign: ':'})}
    stream: true,
  })
   
  for await (const chunk of completion) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '')
  }
}

main();`;

  env.pages.javascript = {
    name: 'javascript',
    lang: 'javascript',
    file: 'llm.js',
    code: code
  };
  
  return env;
}


/*
 * curl (shell)
 */
export function CurlGenerator({db, key, env}) {

  const code = 
`curl http://${env.server_host}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer none" \\
  -d '{
    "model": "${env.model_name}",
    "messages": [{"role":"user","content":"${TEST_PROMPT}"}],${GenerationConfig({db: db, key:key, env:env, indent: 4, assign: ': ', quote: '\"'})}
    "stream": true                
  }'
`;

  env.pages.curl = {
    name: 'curl',
    lang: 'shell',
    code: code
  };

  return env;
}


/*
 * Generation parameters
 */
export function GenerationConfig({db, key, env, quote='', assign='=', indent=2}) {
  env.temperature ??= 0.2;
  env.top_p = 0.7;

  const params = {
    'temperature': 'temperature',
    'top_p': 'top_p',
    'max_context_len': 'max_tokens'
  }

  let txt = '';

  for( const param_key in params ) {
    if( !exists(env[param_key]) )
      continue
    txt += `\n${' '.repeat(indent)}${quote}${params[param_key]}${quote}${assign}${env[param_key]},`
  }

  return txt;
}


const _LANG_TO_EXT = {
  shell: '.sh',
  yaml: '.yml',
  python: '.py',
  javascript: '.js'
};


/*
 * export a zip file to download with everything
 */
export function ZipGenerator({db, keys}) {

  let zip = new JSZip();
  let folders = {};

  const families = db.children['llm'];
  
  for( const family_name of families )
    folders[family_name] = zip.folder(family_name);

  for( const key of keys ) {
    const env = ModelGenerator({db: db, key: key});

    if( !exists(env) )
      continue;

    const x = db.flat[key];

    function find_family() {
      for( const family_name of families ) {
        if( db.ancestors[key].includes(family_name) )
          return family_name;
      }
    }

    const group = find_family();
    const key_folder = exists(group) ? folders[group].folder(key) : zip.folder(key);

    for( const page_name in env.pages ) {
      const page = env.pages[page_name];
      const file = get_page_name(page);
      key_folder.file(file, page.code);
    }
  }

  const zip_name = keys.length > 1 ? 'jetson-ai-lab.zip' : `${keys[0]}.zip`;

  zip.generateAsync({type:"blob"})
  .then(function(content) {
      saveAs(content, zip_name); // see FileSaver.js
  });
}


/*
 * Browser file downloader
 */
export function save_page({page}) {
  if( is_list(page) )
    return save_pages(page);
  var blob = new Blob([page.code], {type: "text/plain;charset=utf-8"});
  saveAs(blob, get_page_name(page));
}

function find_key(x) {
  for( const z in x ) {
    if( exists(x[z].key) )
      return x[z].key;
  }
}

export function save_pages(pages) {
  console.log('Saving pages to zip', pages);
  const key = find_key(pages);
  console.log('SAVE PAGES  KEY', key);

  let zip = new JSZip();
  let folder = zip.folder(key);

  for( const page_key in pages ) {
    const page = pages[page_key];
    folder.file(get_page_name(page), page.code);
  }

  const zip_name = `${key}.zip`;
  zip.generateAsync({type:"blob"})
  .then(function(content) {
      saveAs(content, zip_name); 
  });
}


/*
 * Generate a filename for content if they don't already have one
 */
export function get_page_name(page) {
  let file = page.file;

  if( !exists(file) ) {
    file = `${page.name}${_LANG_TO_EXT[page.lang]}`;
  }

  return file;
}


/*
 * Parse model names from path (normally this should just use the model key)
 */
export function get_model_name(model) {
  //model = model.split('/');
  //return model[model.length-1];
  return model.replace('hf.co/', '');
}

export function get_model_repo(model) {
  return model.replace('hf.co/', '');
}


/*
 * Validate missing entries from pages (for reverse links through the UI)
 */
function ValidatePages(args) {
  let pages = args.env.pages;
  //if( !is_list(pages) )
  //  pages = [pages];
  for( const page_key in pages ) {
    let page = pages[page_key];
    page.db ??= args.db;
    page.key ??= args.key;

    if( page.code.includes('undefined') )
      return null;
  }
  //pages.db ??= args.db;
  //pages.key ??= args.key;
  //args.env.pages = pages;
  return pages;
}