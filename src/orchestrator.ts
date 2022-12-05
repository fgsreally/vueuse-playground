import { reactive, watch, watchEffect } from "vue";
// import { parse } from '@vue/compiler-sfc'
import { createEventHook } from "@vueuse/core";
import lz from "lz-string";
import { compileFile } from "./compiler/sfcCompiler";
// const demos = import.meta.glob('../demos/**/*.(vue|json)')

const shouldUpdateContent = createEventHook();

export interface OrchestratorPackage {
  name: string;
  description?: string;
  version?: string;
  url: string;
  source?: string;
}

export class OrchestratorFile {
  filename: string;
  template: string;
  script: string;
  style: string;

  compiled = {
    js: "",
    css: "",
    ssr: "",
  };

  constructor(
    filename: string,
    template: string | undefined,
    script: string | undefined,
    style?: string
  ) {
    this.filename = filename;
    this.template = template || "";
    this.script = script || "";
    this.style = style || "";
  }

  get code() {
    return `
      <script setup>
        ${this.script}
      </script>
      <template>
        ${this.template}
      </template>
      `;
  }
}

export interface Orchestrator {
  files: {
    [key: string]: OrchestratorFile;
  };
  packages: OrchestratorPackage[];
  activeFilename: string;
  errors: (string | Error)[];
  runtimeErrors: (string | Error)[];

  readonly activeFile: OrchestratorFile | undefined;
  readonly imports: { importMap: string; sideEffect: string[] };
}

/**
 * Main app orchestrator, handles all the files, import maps, and errors
 */
export const orchestrator: Orchestrator = reactive({
  files: {
    "App.vue": new OrchestratorFile("App.vue", "", ""),
  },
  packages: [],
  activeFilename: "App.vue",
  errors: [],
  runtimeErrors: [],

  get activeFile() {
    // @ts-ignore
    return orchestrator.files[this.activeFilename];
  },

  get imports() {
    const imports = orchestrator.packages
      .filter((item) => !item.url.endsWith("css"))
      .map(({ name, url }) => `"${name}": "${url}"`);

    return {
      importMap: `
      {
        "imports": {
          ${imports.join(",\n")}
        }
      }
    `,
      sideEffect: orchestrator.packages
        .filter((item) => item.url.endsWith("css"))
        .map(({ url }) => url),
    };
  },
});

/**
 * Setup Watchers
 */

watchEffect(() => {
  if (orchestrator.activeFile) compileFile(orchestrator.activeFile);
});

watch(
  () => orchestrator.activeFilename,
  () => {
    shouldUpdateContent.trigger(null);
  }
);

export function exportState() {
  const files = Object.entries(orchestrator.files).reduce(
    (acc, [name, { template, script }]) => {
      acc[name] = { template, script };
      return acc;
    },
    {}
  );

  return lz.compressToEncodedURIComponent(
    JSON.stringify({
      packages: orchestrator.packages,
      files,
    })
  );
}

/**
 * Add a file to the orchestrator
 *
 * @param file File content
 */
export function addFile(file: OrchestratorFile) {
  orchestrator.files = {
    ...orchestrator.files,
    [file.filename]: file,
  };

  compileFile(orchestrator.files[file.filename]);
}

export function setActiveFile(name: string) {
  orchestrator.activeFilename = name;
}

/**
 * Remove a file from the orchestrator
 *
 * @param name Name of file to remove
 */
export function removeFile(name: string) {
  delete orchestrator.files[name];
  setTimeout(() => setActiveFile("App.vue"), 0);
}

/**
 * Remove all files from the orchestrator
 */
export function removeAllFiles() {
  orchestrator.files = {};
}

/**
 * Load a demo folder
 *
 * @param name Name of demo to open
 */
// export async function openDemo(name: string) {
//   // Get all modules from demo
//   const modules = (await Promise.all(Object.entries(demos)
//     .filter(([path]) => path.split('demos/')[1].split('/')[0] === name)
//     .filter(([path]) => path.includes('.vue') || path.includes('.json'))
//     .map(async([path]) => ([path, (await import(`${path}?raw`)).default]))))

//   console.log(modules)

//   const packages = (await Promise.all(Object.entries(demos)
//     .filter(([path]) => path.split('demos/')[1].split('/')[0] === name)
//     .filter(([path]) => path.includes('.json'))
//     .map(async([path, imp]) => ([path, (await imp()).default]))))
//     .find(([path]) => path.includes('packages.json'))

//   if (packages)
//     orchestrator.packages = packages[1]

//   removeAllFiles()

//   // Load Vue Files
//   modules
//     .filter(([path]) => path.includes('.vue'))
//     .map(([path, content]) => {
//       const { descriptor: { template, scriptSetup } } = parse(content)
//       return {
//         filename: path.split(`${name}/`)[1],
//         script: scriptSetup?.content.trim(),
//         template: template?.content.trim(),
//       }
//     })
//     .forEach(({ filename, script, template }) => {
//       addFile(new OrchestratorFile(filename, template, script))
//     })

//   setActiveFile('App.vue')
//   shouldUpdateContent.trigger(null)
// }

export const onShouldUpdateContent = shouldUpdateContent.on;

// openDemo('default')

// App.vue
const appTemplate = `
<div
  grid="~ flow-col gap-4"
  place="content-center items-center"
  h="screen"
  font="mono"
  >
  <Coordinate label="X" :value="x" />
  <Coordinate label="Y" :value="y" />
</div>
`;
const appScript = `
import { useMouse } from '@vueuse/core'
import Coordinate from './Coordinate.vue'

const { x, y } = useMouse()
`;

// Coordinate.vue
const coordinateTemplate = `
<div
  font="mono"
  bg="light-500 dark:dark-500"
  flex="~ col"
  text="center"
  p="2"
  border="rounded"
>
  <span text="4xl">{{ value }}</span>
  <span text="sm dark:light-900 dark:opacity-50" m="t-2">Mouse {{ label }}</span>
</div>
`;

const coordinateScript = `
defineProps({
  label: String,
  value: Number,
})
`;

const initialPackages = [
  {
    name: "@vueuse/core",
    source: "esm.sh",
    description: "Collection of essential Vue Composition Utilities",
    url: "https://esm.sh/@vueuse/core?external=vue",
  },
  {
    name: "element-plus",
    source: "esm.sh",
    description: "A Vue.js 3.0 UI Library made by Element team",
    url: "https://esm.sh/element-plus?external=vue",
  },
  {
    name: "element-plus/css",
    source: "esm.sh",
    description: "A Vue.js 3.0 UI Library made by Element team",
    url: "https://esm.sh/element-plus@2.2.22/dist/index.css",
  },
];

function loadInitialState() {
  removeAllFiles();

  if (location.hash.slice(1)) {
    const { files, packages } = JSON.parse(
      lz.decompressFromEncodedURIComponent(location.hash.slice(1))
    );

    if (files && packages) {
      orchestrator.packages = packages;

      for (const f in files) {
        console.log(f);
        addFile(new OrchestratorFile(f, files[f].template, files[f].script));
      }
      setActiveFile("App.vue");
      shouldUpdateContent.trigger(null);
    }
  } else {
    orchestrator.packages = initialPackages;
    addFile(
      new OrchestratorFile("App.vue", appTemplate.trim(), appScript.trim())
    );
    addFile(
      new OrchestratorFile(
        "Coordinate.vue",
        coordinateTemplate.trim(),
        coordinateScript.trim()
      )
    );
    setActiveFile("App.vue");
    shouldUpdateContent.trigger(null);
  }
}

setTimeout(() => {
  loadInitialState();
}, 0);

window.addEventListener('hashchange', loadInitialState, false);

