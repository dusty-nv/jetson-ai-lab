/*
 * Utility functions that build configurations & commands for launching services,
 * proccessing jobs or initiating workflow actions.
 */ 

export function ConfigGenerator(args) {
  args.config ??= {};

  DockerGenerator(args);
  PythonGenerator(args);
  JavascriptGenerator(args);
  
  console.log(`[ConfigGenerator] generated configs for '${args.key}'`, args.config);
  return args.config;
}

export function DockerGenerator({db, key, config={}}) {

  if( !db.ancestors[key].includes('container') )
    return config;

  config.docker_run = {
    name: 'docker run',
    lang: 'shell',
    code: `docker run -d \n  -v /mnt/NVME:/mount\n  --gpus all\n    nvcr.io/l4t-pytorch\n      python3 -c 'import torch'`
  };

  var compose = composerize(config.docker_run.code, null, 'latest', 2); // this gets imported globally by nanolab.js
  compose = compose.substring(compose.indexOf("\n") + 1); // first line from composerize is an unwanted name
  compose = `# Save as docker-compose.yml and run 'docker-compose up'\n` + compose;

  config.docker_compose = {
    name: 'docker compose',
    lang: 'yaml',
    code: compose
  };

  return config;
}

export function PythonGenerator({db, key, config={}}) {

  config.python = {
    name: 'python',
    lang: 'python',
    code: '/portal/python/completion.py'
  };
  
  return config;
}

export function JavascriptGenerator({db, key, config={}}) {

  config.javascript = {
    name: 'javascript',
    lang: 'javascript',
    code: '/portal/js/models/completion.js'
  };
  
  return config;
}