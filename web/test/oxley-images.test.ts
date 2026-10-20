import {test} from 'node:test';
import assert from 'node:assert/strict';
import {artworkUrl,imageIds,parseArtwork} from '../lib/oxley-images';
const market={dealId:`0x${'a'.repeat(64)}`,coin:`0x${'b'.repeat(40)}`};
const cid='bafkreigsu6odw4by3unutdxp4xuo5xr5zirlzl7ni5vgptvuxw7xucftwq';
test('artwork requires both market and token identity, with safe CID URLs',()=>{
 const items=parseArtwork({items:[{...market,cid}]});
 assert.equal(artworkUrl(items,market),`https://gateway.pinata.cloud/ipfs/${cid}`);
 assert.equal(artworkUrl(items,{...market,coin:`0x${'c'.repeat(40)}`}),undefined);
 assert.equal(artworkUrl(items,{...market,dealId:`0x${'d'.repeat(64)}`}),undefined);
 assert.deepEqual(parseArtwork({items:[{...market,cid:'https://attacker.example/image'},{...market,cid:'../../secret'}]}),[]);
 assert.deepEqual(parseArtwork(null),[]);
});
test('metadata requests are bounded and contain only market identifiers',()=>{
 assert.deepEqual(imageIds(market.dealId),[market.dealId]);
 assert.equal(imageIds(''),undefined);assert.equal(imageIds('https://example.com'),undefined);
 assert.equal(imageIds(Array.from({length:51},(_,i)=>`0x${i.toString(16).padStart(64,'0')}`).join(',')),undefined);
});
