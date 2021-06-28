
const PublicResolver = artifacts.require('./resolvers/PublicResolver.sol');
const ReverseRegistrar = artifacts.require('./registry/ReverseRegistrar.sol');
const FNS = artifacts.require('./registry/FNSRegistry.sol');
const NameWrapper = artifacts.require('DummyNameWrapper.sol');

const namehash = require('eth-fns-namehash');
const sha3 = require('web3-utils').sha3;

contract('ReverseRegistar', function (accounts) {

    let node;
    let registrar, resolver, fns, nameWrapper;

    beforeEach(async () => {
        node = namehash.hash(accounts[0].slice(2).toLowerCase() + ".addr.reverse");
        fns = await FNS.new();
        nameWrapper = await NameWrapper.new();
        resolver = await PublicResolver.new(fns.address, nameWrapper.address);
        registrar = await ReverseRegistrar.new(fns.address, resolver.address);

        await fns.setSubnodeOwner('0x0', sha3('reverse'), accounts[0], {from: accounts[0]});
        await fns.setSubnodeOwner(namehash.hash('reverse'), sha3('addr'), registrar.address, {from: accounts[0]});
    });

    it('should calculate node hash correctly', async () => {
        assert.equal(await registrar.node.call(accounts[0]), node);
    });

    it('allows an account to claim its address', async () => {
        await registrar.claim(accounts[1], {from: accounts[0]});
        assert.equal(await fns.owner(node), accounts[1]);
    });

    it('allows an account to specify resolver', async () =>  {
        await registrar.claimWithResolver(accounts[1], accounts[2], {from: accounts[0]});
        assert.equal(await fns.owner(node), accounts[1]);
        assert.equal(await fns.resolver(node), accounts[2]);
    });

    it('does not overwrite resolver if not specified', async () => {
        await registrar.claimWithResolver(accounts[1], accounts[2], {from: accounts[0]});
        await registrar.claim(accounts[3], {from: accounts[0]});

        assert.equal(await fns.owner(node), accounts[3]);
        assert.equal(await fns.resolver(node), accounts[2]);
    });

    it('sets name records', async () => {
        await registrar.setName('testname', {from: accounts[0], gas: 1000000});
        assert.equal(await fns.resolver(node), resolver.address);
        assert.equal(await resolver.name(node), 'testname');
    });

    // @todo this test does not work.
    // it('allows the owner to update the name', async () => {
    //     await registrar.claimWithResolver(accounts[1], resolver.address, {from: accounts[0]});
    //     await registrar.setName('testname', {from: accounts[1]});
    //     assert.equal(await resolver.name(node), 'testname');
    // });

// @todo does not work because we shifted to a dummy resolver
//    it('does not allow non-owners to update the name', async () => {
//        await registrar.claimWithResolver(accounts[1], resolver, {from: accounts[0]});
//
//        try {
//            await resolver.setName(node, 'testname', {from: accounts[0]})
//        } catch (error) {
//            return utils.ensureException(error);
//        }
//
//        assert.fail('updating name did not fail');
//    });
});
