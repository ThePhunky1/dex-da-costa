// Compile the pinned, unmodified upstream contracts with their original compiler versions.
// Only the router's init-code hash is replaced to match this exact pair compilation.
import fs from 'node:fs';
import path from 'node:path';
import coreSolc from 'solc-core';
import routerSolc from 'solc-periphery';
import { keccak256 } from 'viem';
const out = 'contracts/artifacts';
fs.mkdirSync(out, { recursive: true });
function compile(compiler, entry, replacements = {}) {
  const source = fs.readFileSync(`node_modules/${entry}`, 'utf8');
  const input = { language: 'Solidity', sources: { [entry]: { content: source } }, settings: {
    optimizer: { enabled: true, runs: 200 }, evmVersion: 'istanbul',
    outputSelection: { '*': { '*': ['abi','evm.bytecode.object','evm.deployedBytecode.object','evm.deployedBytecode.immutableReferences'] } }
  }};
  const result = JSON.parse(compiler.compile(JSON.stringify(input), { import: name => {
    try { return { contents: replacements[name] ?? fs.readFileSync(path.join('node_modules', name), 'utf8') }; }
    catch { return { error: `Missing pinned source: ${name}` }; }
  }}));
  const errors = (result.errors ?? []).filter(e => e.severity === 'error');
  if (errors.length) throw Error(errors.map(e => e.formattedMessage).join('\n'));
  for (const contracts of Object.values(result.contracts)) for (const [name, contract] of Object.entries(contracts)) {
    if (!contract.evm.bytecode.object) continue;
    fs.writeFileSync(`${out}/${name}.json`, JSON.stringify({ abi: contract.abi,
      bytecode: {object: `0x${contract.evm.bytecode.object}`},
      deployedBytecode: {object: `0x${contract.evm.deployedBytecode.object}`, immutableReferences:contract.evm.deployedBytecode.immutableReferences ?? {}} }, null, 2));
  }
  const completeSources=Object.fromEntries(Object.keys(result.sources).map(name=>[name,{content:replacements[name]??fs.readFileSync(path.join('node_modules',name),'utf8')}]));
  fs.writeFileSync(`${out}/standard-input-${path.basename(entry,'.sol')}.json`,JSON.stringify({...input,sources:completeSources},null,2));
  return result;
}
compile(coreSolc, '@uniswap/v2-core/contracts/UniswapV2Factory.sol');
const pair = JSON.parse(fs.readFileSync(`${out}/UniswapV2Pair.json`));
const hash = keccak256(pair.bytecode.object);
const libraryPath = '@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol';
const library = fs.readFileSync(`node_modules/${libraryPath}`, 'utf8');
const patched = library.replace(/hex'[0-9a-f]{64}'/, `hex'${hash.slice(2)}'`);
if (patched === library && !library.includes(hash.slice(2))) throw Error('Init-code hash replacement failed');
compile(routerSolc, '@uniswap/v2-periphery/contracts/UniswapV2Router02.sol', { [libraryPath]: patched });
compile(routerSolc, '@uniswap/v2-periphery/contracts/test/WETH9.sol');
fs.writeFileSync(`${out}/build-info.json`, JSON.stringify({core:'@uniswap/v2-core@1.0.1',periphery:'@uniswap/v2-periphery@1.1.0-beta.0',coreCompiler:coreSolc.version(),routerCompiler:routerSolc.version(),pairInitCodeHash:hash,optimizerRuns:200,evmVersion:'istanbul',routerLibrary:patched},null,2));
console.log(`Compiled upstream V2 factory, pair, router and WETH9. Pair init hash: ${hash}`);
