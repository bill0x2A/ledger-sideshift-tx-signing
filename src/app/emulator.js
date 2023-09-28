import Zemu, { DEFAULT_START_OPTIONS } from "@zondax/zemu";
import { resolve as Resolve } from "path";
import dir from 'node-dir';
const APP_SEED = "equip will roof matter pink blind book anxiety banner elbow sun young"; // our recurrent example

const customOptions = {
  ...DEFAULT_START_OPTIONS,
  custom: `-s "${APP_SEED}"`,
};

const SIDELOADED_APPLICATIONS = {
  'bitcoin': 'Bitcoin',
  'ethereum': 'Ethereum',
  'exchange': 'Exchange',
};

const getApplications = () => {
  const applications = {};
  for (let path of dir.files('./elfs/', { sync: true })) {
      Object.entries(SIDELOADED_APPLICATIONS).forEach(
          ([file_prefix, name]) => {
              if (path.split('/')[1].startsWith(file_prefix + '_' + 'nanox' + '.')) {
                  applications[name] = Resolve(path);
              }
          }
      );
  }
  return applications;
}

test("example", async () => {
  const sim = new Zemu("path/to/your/elf/file.elf");
  try {
    // create an instance of your ledger-js app
    const demoApp = new DemoApp(sim.getTransport());
    // start your simulator
    await sim.start(customOptions);
    // your testing goes here, as you would do in your wallet
  } finally {
    // this will close and remove the container
    await sim.close();
  }
});