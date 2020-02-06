let Splitter = artifacts.require('Splitter')
let BigNumber = require('bignumber.js');
const utils = require("./helpers/utils");

contract("Splitter", (accounts) => {

  const amount = new BigNumber(1000);
  const [alice, bob, carol] = accounts;
  const bobTwo = accounts[1]; // Duplicate of Bob
  const zeroAdd = 0x0000000000000000000000000000000000000000;
  const zeroValue = 0;
  let contractInstance;

  beforeEach(async () => {
    contractInstance = await Splitter.new({ from: alice });
  });

  describe("Testing contract owner", function() {
    it("The deployer should be Alice", async () => {
      const result = await contractInstance.getOwner({from: alice});
      assert.strictEqual(result, alice, "Sender is not Owner");
    });
  });

  describe("Testing Splitter", function() {
    it("Should send money to Split", async () => {
      const splitResult = await contractInstance.split(bob, carol, {from: alice, value: amount})
      assert.isTrue(splitResult.receipt.status, true, "Status is false");
      // Use context function to do a 0 ETH split straight after
      // Use context function to group all requires using utils?
    });
    it("Should check balance after Split", async () => {
      await contractInstance.split(bob, carol, {from: alice, value: amount})
      const bobBalance = await contractInstance.balances(bob, {from: alice});
      const carolBalance = await contractInstance.balances(carol, {from: alice});
      assert.strictEqual(bobBalance.toString(10), amount.div(2).toString(10), "Bob did not recieve the correct amount")
      assert.strictEqual(carolBalance.toString(10), amount.div(2).toString(10), "Carol did not recieve the correct amount")
    })
    it("Split should fire an event when executed", async () => {
      const splitResult = await contractInstance.split(bob, carol, {from: alice, value: amount})
      assert.strictEqual(splitResult.receipt.logs[0].args.__length__, 2, "Two events should have been emitted");
      assert.strictEqual(splitResult.receipt.logs[0].event, 'LogSplit', "Event 'Split' didn't fire");
      assert.strictEqual(splitResult.receipt.logs[0].args.sender, alice, "Event 'Split' didn't fire");
      //assert.strictEqual(splitResult.receipt.logs[0].args._amount.toString(10), amount.div(2).toString(10), "Event 'Split' didn't fire");
    })
    it("Should not allow to Split 0x0 addresses", async () => {
      await utils.shouldThrow(contractInstance.split(zeroAdd, carol, {from: alice}));
      await utils.shouldThrow(contractInstance.split(zeroAdd, zeroAdd, {from: alice}));
      await utils.shouldThrow(contractInstance.split(zeroAdd, bob, {from: alice}));
    })
    it("Should not allow you to split value amount of 0", async () => {
      await utils.shouldThrow(contractInstance.split({from: alice, value: 0}));
    })
    it("Should not allow recipient1 to equal recipient2", async () => {
      await utils.shouldThrow(contractInstance.split(bob, bobTwo, {from: alice, value: amount}));
    })

  describe("Testing when Stop() and Kill() have been called", function() {
    it("Should not allow me to use split when stop() is called", async () => {
      await contractInstance.stop();
      await utils.shouldThrow(contractInstance.split(bob, carol, {from: alice, value: amount}));
      await utils.shouldThrow(contractInstance.withdraw(amount.div(2), {from: bob}));
    })
    it("Should not allow me to use split when kill() is called", async () => {
      await contractInstance.stop();
      await contractInstance.kill();
      await utils.shouldThrow(contractInstance.split(bob, carol, {from: alice, value: amount}));
      await utils.shouldThrow(contractInstance.withdraw(alice, bob, {from: carol, value: amount}));
    })
    it("Sould not allow non-owner to call withdrawWhenKilled()", async () => {
      await contractInstance.stop();
      await contractInstance.kill();
      await utils.shouldThrow(contractInstance.withdrawWhenKilled({from: carol}));
    })
   })
  })

  describe("Testing withdraw function", function() {
    it("Should allow Bob and Carol to withdraw their split amount", async () => {
      await contractInstance.split(bob, carol, {from: alice, value: amount});
      const bobWithdraw = await contractInstance.withdraw(amount.div(2), {from: bob});
      const carolWithdraw = await contractInstance.withdraw(amount.div(2), {from: carol});

      assert.isTrue(bobWithdraw.receipt.status, true, "Status did not return true" );
      assert.isTrue(carolWithdraw.receipt.status, true, "Status did not return true");
    })
    it("Should not allow 0 value withdrawals", async () => {
      await utils.shouldThrow(contractInstance.withdraw(0, {from: bob}))
      await utils.shouldThrow(contractInstance.withdraw(0, {from: carol}))
    })
    it("Should not allow withdrawals greater than callers balance", async () => {
      const result = await contractInstance.split(bob, carol, {from: alice, value: amount});
      // We split amount which is equal to 1000. So bob & carol should have 500
      //console.log(result); // It successfully split
      const x = await contractInstance.balances(bob, {from: alice});
      //console.log(x.toString(10));
      // Now we'll try to withdraw > 500 (amount which is 1000, because we're greedy)
      //const bobWithdraw = await contractInstance.withdraw(amount, {from: bob});
      await utils.shouldThrow(contractInstance.withdraw(amount, {from: bob}));
      await utils.shouldThrow(contractInstance.withdraw(amount, {from: carol}));
      // The call commented below fails due to insufficient balance
      //await contractInstance.withdraw(amount, {from: carol});
    })
    it("Should emit an event when withdraw is called", async () => {
      await contractInstance.split(bob, carol, {from: alice, value: amount});
      const result = await contractInstance.withdraw(amount.div(2), {from: bob});
      assert.strictEqual(result.receipt.logs[0].event, "LogWithdrawCalled", "Withdraw event did not fire");
      assert.strictEqual(result.receipt.logs[0].args.__length__, 2, "Withdraw should have emitted one event");
      assert.strictEqual(result.receipt.logs[0].args._withdrawer, bob, "Bob was not the withdrawer");
      assert.strictEqual(result.receipt.logs[0].args._withdrawAmount.toString(10), amount.div(2).toString(10), "Did not withdraw the correct amount");
    })
  })
  
  describe("Testing gasUsed * gasPrice", function() {

    beforeEach("Run split()", function() {
      const sendAmount = 1000;
      return contractInstance.split(bob, carol, {from: alice, value: sendAmount})
    }) 

    it("Should split multiple amongst Bob & Carol with txFee's taken into consideration", async () => {
      let hash;
      let gasUsed = 0;
      let gasPrice = 0;
      let txFee = 0;
      let receiveAmount = 0;
      let balanceBefore;
      let balanceNow;
      let startBalance;
      const sendAmount = 1000;

      startBalance = new BigNumber(await web3.eth.getBalance(bob));

      balanceBefore = await contractInstance.balances(bob, {from:alice});

      const txObj = await contractInstance.withdraw(sendAmount / 2, {from: bob})
      assert.equal(txObj.receipt.status, true, "withdraw event was not true");

      hash = txObj.receipt.transactionHash; // Get tx hash for gas used.
      const tx = await web3.eth.getTransaction(hash); //Returns a transaction matching the given transaction hash.
      gasUsed = txObj.receipt.gasUsed;
      gasPrice = tx.gasPrice;
      txFee = gasUsed * gasPrice;
      balanceNow = new BigNumber(await web3.eth.getBalance(bob));        
      receiveAmount = sendAmount / 2;

      assert.equal(balanceNow.toString(10), startBalance.plus(receiveAmount).minus(txFee).toString(10), "Bob's balance did not return as intended");

    })
  }) 
})