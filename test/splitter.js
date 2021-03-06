const Splitter = artifacts.require('Splitter')
const utils = require("./helpers/utils");

contract("Splitter", (accounts) => {
  
  const { BN } = web3.utils;
  const amount = new BN(1000);
  const [owner, recipient1, recipient2] = accounts;
  const recipient1Duplicate = recipient1; 
  const zeroAdd = 0x0000000000000000000000000000000000000000;
  let contractInstance;
  
  beforeEach("Create new Splitter instance", async () => {
    contractInstance = await Splitter.new({ from: owner});
  });

  describe("Testing contract owner", function() {
    it("The deployer should be the Owwer", async () => {
      const contractOwner = await contractInstance.getOwner({from: accounts[3]});
      assert.strictEqual(contractOwner, owner, "Sender is not Owner");
    });
  });

  describe("Testing Splitter", function() {

    it("Should check balance after Split", async () => {
      await contractInstance.split(recipient1, recipient2, {from: owner, value: amount})
      const recipient1Balance = await contractInstance.balances(recipient1, {from: owner});
      const recipient2Balance = await contractInstance.balances(recipient2, {from: owner});
      assert.strictEqual(recipient1Balance.toString(10), "500", "recipient1 did not recieve the correct amount")
      assert.strictEqual(recipient2Balance.toString(10), "500", "recipient2 did not recieve the correct amount")
    });

    it("Split should fire an event when executed", async () => {
      const splitResult = await contractInstance.split(recipient1, recipient2, {from: owner, value: amount})
      const splitLogs = splitResult.receipt.logs[0];
      assert.isTrue(splitResult.receipt.status, "Status is false");
      assert.strictEqual(splitLogs.args.__length__, 5, "Two events should have been emitted");
      assert.strictEqual(splitLogs.event, 'LogSplit', "Event 'Split' didn't fire");
      assert.strictEqual(splitLogs.args.sender, owner, "Event 'Split' didn't fire");
      assert.strictEqual(splitLogs.args.splitAmount.toString(10), "500", "SplitAmount is incorrect");
    });

    it("Should not allow to Split 0x0 addresses", async () => {
      await utils.shouldThrow(contractInstance.split(zeroAdd, recipient2, {from: owner, value: amount}));
      await utils.shouldThrow(contractInstance.split(zerFoAdd, zeroAdd, {from: owner, value: amount}));
      await utils.shouldThrow(contractInstance.split(zeroAdd, recipient1, {from: owner, value: amount}));
    });

    it("Should not allow you to split value amount of 0", async () => {
      await utils.shouldThrow(contractInstance.split(recipient1, recipient2, {from: owner, value: 0}));
      await utils.shouldThrow(contractInstance.split(recipient2, recipient1, {from: owner, value: 0}));
    });

    it("Should not allow recipient1 to equal recipient2", async () => {
      await utils.shouldThrow(contractInstance.split(recipient1, recipient1Duplicate, {from: owner, value: amount}));
    });

  });

  describe("Testing when Stop() and Kill() have been called", function() {

    it("Should not allow me to use split when stop() is called", async () => {
      await contractInstance.stop({from: owner});
      await utils.shouldThrow(contractInstance.split(recipient1, recipient2, {from: owner, value: amount}));
      await utils.shouldThrow(contractInstance.withdraw("500", {from: recipient1}));
    })

    it("Should not allow me to use split when kill() is called", async () => {
      const result = await contractInstance.split(recipient1, recipient2, {from: owner, value: amount});
      assert.strictEqual(result.logs[0].event, 'LogSplit', "Event 'Split' did't fire");
      await contractInstance.stop({from: owner});
      await contractInstance.kill({from: owner});
      await utils.shouldThrow(contractInstance.split(recipient1, recipient2, {from: owner, value: amount}));
      await utils.shouldThrow(contractInstance.withdraw(owner, recipient1, {from: recipient2, value: amount}));
    })

    it("Sould not allow non-owner to call withdrawWhenKilled()", async () => {
      await contractInstance.stop({from: owner});
      await contractInstance.kill({from: owner});
      await utils.shouldThrow(contractInstance.withdrawWhenKilled({from: recipient2}));
    });

  });

  describe("Testing withdraw function", function() {

    it("Should allow recipient1 to withdraw their split amount", async () => {
      await contractInstance.split(recipient1, recipient2, {from: owner, value: amount});
      const recipient1Withdraw = await contractInstance.withdraw("500", {from: recipient1});
      assert.isTrue(recipient1Withdraw.receipt.status, "Status did not return true" );
    });

    it("Should allow recipient2 to withdraw their split amount", async () => {
      await contractInstance.split(recipient1, recipient2, {from: owner, value: amount});
      const recipient2Withdraw = await contractInstance.withdraw("500", {from: recipient2});
      assert.isTrue(recipient2Withdraw.receipt.status, "Status did not return true");
    });

    it("Should not allow 0 value withdrawals", async () => {
      await utils.shouldThrow(contractInstance.withdraw("0", {from: recipient1}))
      await utils.shouldThrow(contractInstance.withdraw("0", {from: recipient2}))
    });

    it("Should not allow withdrawals greater than callers balance", async () => {
      await contractInstance.split(recipient1, recipient2, {from: owner, value: amount});

      await utils.shouldThrow(contractInstance.withdraw("501", {from: recipient1}));
      await utils.shouldThrow(contractInstance.withdraw("501", {from: recipient2}));
    });

    it("Should emit an event when withdraw is called", async () => {
      const startingBalance =  await contractInstance.balances(recipient1, {from: recipient1});
      assert.strictEqual(startingBalance.toString(10), "0", "Starting balance is not 0")

      const splitResult = await contractInstance.split(recipient1, recipient2, {from: owner, value: amount});
      assert.strictEqual(splitResult.logs[0].event, 'LogSplit', "Event 'Split' did't fire");

      const balanceAfter = await contractInstance.balances(recipient1, {from: recipient1});
      assert.strictEqual(balanceAfter.toString(10), "500", "Balance after Split is incorrect")

      const withdrawResult = await contractInstance.withdraw("499", {from: recipient1});
      
      const withdrawLogs = withdrawResult.receipt.logs[0];
      assert.strictEqual(withdrawLogs.event, "LogWithdrawCalled", "Withdraw event did not fire");
      assert.strictEqual(withdrawLogs.args.__length__, 2, "Withdraw should have emitted one event");
      assert.strictEqual(withdrawLogs.args.withdrawer, recipient1, "recipient1 was not the withdrawer");
      assert.strictEqual(withdrawLogs.args.withdrawAmount.toString(10), "499", "Did not withdraw the correct amount");

    });

    it("Should test recipient1 receiving 2 splits before withdraw", async () => {
      await contractInstance.split(recipient1, recipient2, {from: owner, value: amount});
      await contractInstance.split(recipient1, recipient2, {from: owner, value: amount});
      const twoSplitBalance = await contractInstance.balances(recipient1, {from: recipient1});
      assert.strictEqual(twoSplitBalance.toString(10), "1000", "Balance after 2 Split's is incorrect");
      const result = await contractInstance.withdraw("999", {from: recipient1});
      assert.isTrue(result.receipt.status, "Status did not return true");
      assert.strictEqual(result.receipt.logs[0].event, "LogWithdrawCalled", "Balance after 2 Split's is incorrect");
      assert.strictEqual(result.receipt.logs[0].args.withdrawAmount.toString(10), "999", "Did not withdraw correct amount");
    });

  });
  
  describe("Testing gasUsed * gasPrice", function() {

    beforeEach("Run split()", function() {
      const sendAmount = 1000;
      return contractInstance.split(recipient1, recipient2, {from: owner, value: sendAmount})
    }) 

    it.only("Should split multiple amongst Recipient1 & Recipient2 with txFee's taken into consideration", async () => {

      const sendAmount = 1000;

      const startBalance = new BN(await web3.eth.getBalance(recipient1));

      // const balanceBefore = await contractInstance.balances(recipient1, {from:owner});

      const txObj = await contractInstance.withdraw("500", {from: recipient1})

      assert.isTrue(txObj.receipt.status, "withdraw event was not true");

      const tx = await web3.eth.getTransaction(txObj.receipt.transactionHash); 
      const gasUsed = new BN(txObj.receipt.gasUsed);
      const gasPrice = new BN(tx.gasPrice);
      const txFee = gasUsed.mul(gasPrice);
      const balanceNow = await web3.eth.getBalance(recipient1);        
      const receiveAmount = new BN(sendAmount).div(new BN(2));

      assert.strictEqual(
        balanceNow.toString(10),
        startBalance.add(receiveAmount).sub(txFee).toString(10),
        "recipient1's balance did not return as intended");

    });

  });

});