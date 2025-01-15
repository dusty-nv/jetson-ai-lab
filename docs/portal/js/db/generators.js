/*
 * Templates that generate docker service configs, code examples, docs, ect.
 * for launching containers, jobs, or initiating workflow actions.
 */ 
import {exists, wrapLines} from '../nanolab.js';


/* config pages for docker, python, javascript, shell */
export function ModelGenerator(args) {
  args.config ??= {};

  DockerGenerator(args);
  PythonGenerator(args);
  JavascriptGenerator(args);
  CurlGenerator(args);

  console.log(`[ConfigGenerator] generated configs for '${args.key}'`, args.config);
  return args.config;
}


/*
 * docker run + compose
 */
export function DockerGenerator({db, key, config={}}) {

  if( !db.ancestors[key].includes('container') )
    return config;

  let x = {};
  let cfg = {};

  for( const field_key of db.props[key] ) {
    cfg[field_key] = db.flatten({key: key, property: field_key});
    x[field_key] = cfg[field_key].value;
  }

  console.log('DockerGenerator', x);

  let opt = x.container_options ?? '';

  if( exists(x.CUDA_VISIBLE_DEVICES) ) {
    const tr = x.CUDA_VISIBLE_DEVICES.trim();
    if( tr.length > 0 )
      opt += ` --gpus ${tr} `;
  }

  let network = '--network host';

  if( exists(x.server_host) ) {
    var server_url = new URL('http://' + x.server_host);
    opt += `-p ${server_url.port}:${server_url.port} `;
  }
  else {
    opt += '--network host ';
  }

  if( exists(x.hf_token) ) {
    const tr = x.hf_token.trim();
    if( tr.length > 0 )
      opt += `-e HF_TOKEN=${x.hf_token} `;
  }

  if( exists(x.cache_dir) ) {
    const tr = x.cache_dir.trim();
    if( tr.length > 0 )
      opt += `-v ${tr}=/root/.cache `;
  }

  opt = wrapLines(opt) + ' \\\n ';

  const image = `${x.container_image} \\\n   `; 

  let args = ` \\
      --model ${x.url.replace('hf.co/', '')} \\
      --quantization ${x.quantization} \\
      --max-batch-size ${x.max_batch_size}`;

  if( exists(x.max_context_len) ) {
    args += ` \\
      --max-context-len ${x.max_context_len}`;
  }

  if( exists(x.prefill_chunk) ) {
    args += ` \\
      --prefill-chunk ${x.prefill_chunk}`;
  }

  if( exists(server_url) ) {
    args += ` \\
      --host ${server_url.hostname} \\
      --port ${server_url.port}`;
  }

  if( exists(x.container_args) ) {
    args += ` \\
        ${x.container_args}`;
  }

  let cmd = x.container_cmd
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

  config.docker_run = {
    name: 'docker run',
    lang: 'shell',
    code: cmd
  };

  var compose = composerize(config.docker_run.code, null, 'latest', 2); // this gets imported globally by nanolab.js
  compose = compose.substring(compose.indexOf("\n") + 1); // first line from composerize is an unwanted name
  compose = `# Save as docker-compose.yml and run 'docker-compose up'\n` + compose;

  config.docker_compose = {
    name: 'compose',
    lang: 'yaml',
    code: compose
  };

  return config;
}

const TEST_PROMPT = "Why did the LLM cross the road?";
//const TEST_PROMPT = "You can put multiple chat turns in here.";
//const TEST_PROMPT = "Please tell me about your features as an LLM.";
//const TEST_PROMPT = "Write a limerick about the wonders of GPU computing.";

/*
 * python
 */
export function PythonGenerator({db, key, config={}}) {

  const x = db.flat[key];
  const code = 
`from openai import OpenAI

client = OpenAI(
  base_url = "https://${x.server_host}/v1",
  api_key = "$FAKE_API_KEY"
)

chat = [{
  "role": "user",
  "content": "${TEST_PROMPT}"
}]

completion = client.chat.completions.create(
  model="${x.name}",
  messages=chat,
  temperature=0.2,
  top_p=0.7,
  max_tokens=1024,
  stream=True
)

for chunk in completion:
  if chunk.choices[0].delta.content is not None:
    print(chunk.choices[0].delta.content, end="")
`;

  config.python = {
    name: 'python',
    lang: 'python',
    code: code,
  };
  
  return config;
}


/*
 * javascript (node)
 */
export function JavascriptGenerator({db, key, config={}}) {

  const x = db.flat[key];
  const code = 
`import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://${x.server_host}/v1',
  apiKey: '$FAKE_API_KEY',
})

async function main() {
  const completion = await openai.chat.completions.create({
    model: "${x.name}",
    messages: [{
      "role": "user",
      "content": "${TEST_PROMPT}"
    }],
    temperature: 0.2,
    top_p: 0.7,
    max_tokens: 1024,
    stream: true,
  })
   
  for await (const chunk of completion) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '')
  }
  
}

main();`;

  config.javascript = {
    name: 'javascript',
    lang: 'javascript',
    code: code
  };
  
  return config;
}


/*
 * curl (shell)
 */
export function CurlGenerator({db, key, config={}}) {

  const x = db.flat[key];
  const code = 
`curl https://${x.server_host}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $FAKE_API_KEY" \\
  -d '{
    "model": "${x.name}",
    "messages": [{"role":"user","content":"${TEST_PROMPT}"}],
    "temperature": 0.2,   
    "top_p": 0.7,
    "max_tokens": 1024,
    "stream": true                
  }'
`;

  config.shell = {
    name: 'shell',
    lang: 'shell',
    code: code
  };

  return config;
}