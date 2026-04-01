import * as utils from './utils.js';

export async function setModel(model: string, openClawRoot?: string): Promise<string> {
  const openclaw = utils.resolveOpenClawExecutable(openClawRoot);
  return utils.runCommand(openclaw, ['models', 'set', model]);
}