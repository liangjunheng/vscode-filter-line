import * as Mocha from 'mocha';

let mocha: Mocha;

export function configure(options: Mocha.MochaOptions) {
  mocha = new Mocha(options);
}

export function run() {
  mocha.run(failures => {
    process.exitCode = failures ? 1 : 0;
  });
}

export default {
  configure,
  run,
};
