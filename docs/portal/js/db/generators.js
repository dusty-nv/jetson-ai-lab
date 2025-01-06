/*
 * Utility functions that build configurations & commands for launching services,
 * proccessing jobs or initiating workflow actions.
 */ 

export function ConfigGenerator(args) {
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

  const x = db.flat[key];

  const cmd =
`docker run -it --rm \\
  --gpus all \\ 
  --network host \\
  -v ~/.cache:/root/.cache \\
  -e HF_TOKEN=HUGGINGFACE_TOKEN \\
    dustynv/mlc:0.1.4-r36.4.0 \\
      mlc_deploy \\
        --model dusty-nv/Llama-3.2-3B-Instruct-q4f16_ft-MLC \\
        --quantization q4f16_ft
`;

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


/*
 * python
 */
export function PythonGenerator({db, key, config={}}) {

  const x = db.flat[key];
  const code = 
`from openai import OpenAI

client = OpenAI(
  base_url = "https://${x.host}:${x.port}/v1",
  api_key = "$FAKE_API_KEY"
)

completion = client.chat.completions.create(
  model="${x.name}",
  messages=[{"role":"user","content":"Write a limerick about the wonders of GPU computing."}],
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
  baseURL: 'https://${x.host}:${x.port}/v1',
  apiKey: '$FAKE_API_KEY',
})

async function main() {
  const completion = await openai.chat.completions.create({
    model: "${x.name}",
    messages: [{"role":"user","content":"Write a limerick about the wonders of GPU computing."}],
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
`curl https://${x.host}:${x.port}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $FAKE_API_KEY" \\
  -d '{
    "model": "${x.name}",
    "messages": [{"role":"user","content":"You can put multiple chat turns in here"}],
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