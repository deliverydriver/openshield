import * as utils from './utils.js';

export async function setModel(model: string, openClawRoot?: string): Promise<string> {
  const openclaw = utils.resolveOpenClawExecutable(openClawRoot);
  console.log(`   ⚙️ Setting model to ${model}...`);
  console.log(`   📋 Running: ${openclaw} models set ${model}`);
  const output = await utils.runCommand(openclaw, ['models', 'set', model]);
  if (output) {
    console.log(`   📝 Output: ${output}`);
  }
  console.log(`   ✅ Model set to ${model}`);
  return output;
}