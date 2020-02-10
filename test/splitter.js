const Splitter = artifacts.require('Splitter')
const utils = require("./helpers/utils");

contract("Splitter", (accounts) => {
  
  const { BN } = web3.utils;
  const amount = new BN(1000);
  console.log(amount.toString(10))
  const [owner, recipient1, recipient2] = accounts;
  const recipient1Duplicate = recipient1; 
  const zeroAdd = 0x0000000000000000000000000000000000000000;
  let contractInstance;
  
  beforeEach("Create new Splitter instance", async () => {
    contractInstance = await Splitter.new({ from: owner});
  });

  describe("Testing contract owner", function() {
    it("The deployer should be the Owwer", async () => {
      const contractOwner = await contractInstance.getOwner({from: owner});
      console.log(owner)
      assert.strictEqual(contractOwner, owner, "Sender is not Owner");
    });
  });

  describe("Testing Splitter", function() {

    it("Should check balance after Split", async () => {
      await contractInstance.split(recipient1, recipient2, {from: owner, value: amount})
      const bobBalance = await contractInstance.balances(recipient1, {from: owner});
      const carolBalance = await contractInstance.balances(recipient2, {from: owner});
      assert.strictEqual(bobBalance.toString(10), "500", "Bob did not recieve the correct amount")
      assert.strictEqual(carolBalance.toString(10), "500", "Carol did not recieve the correct amount")
    });

    it("Split should fire an event when executed", async () => {
      const splitResult = await contractInstance.split(recipient1, recipient2, {from: owner, value: amount})
      assert.isTrue(splitResult.receipt.status, true, "Status is false");
      assert.strictEqual(splitResult.receipt.logs[0].args.__length__, 1, "Two events should have been emitted");
      assert.strictEqual(splitResult.receipt.logs[0].event, 'LogSplit', "Event 'Split' didn't fire");
      assert.strictEqual(splitResult.receipt.logs[0].args.sender, owner, "Event 'Split' didn't fire");
      //assert.strictEqual(splitResult.receipt.logs[0].args._amount.toString(10), amount.div(2).toString(10), "Event 'Split' didn't fire");
    });

    it("Should not allow to Split 0x0 addresses", async () => {
      await utils.shouldThrow(contractInstance.split(zeroAdd, recipient2, {from: owner, value: amount}));
      await utils.shouldThrow(contractInstance.split(zeroAdd, zeroAdd, {from: owner, value: amount}));
      await utils.shouldThrow(contractInstance.split(zeroAdd, recipient1, {from: owner, value: amount}));
    });

    it("Should not allow you to split value amount of 0", async () => {
      await utils.shouldThrow(contractInstance.split(recipient1, {from: owner, value: 0}));
      await utils.shouldThrow(contractInstance.split(recipient2, {from: owner, value: 0}));
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

    it("Should allow Bob and Carol to withdraw their split amount", async () => {
      await contractInstance.split(recipient1, recipient2, {from: owner, value: amount});
      const bobWithdraw = await contractInstance.withdraw("500", {from: recipient1});
      const carolWithdraw = await contractInstance.withdraw("500", {from: recipient2});

      assert.isTrue(bobWithdraw.receipt.status, true, "Status did not return true" );
      assert.isTrue(carolWithdraw.receipt.status, true, "Status did not return true");
    });

    it("Should not allow 0 value withdrawals", async () => {
      const zeroBalance1 = balanceBefore = await contractInstance.balances(recipient1, {from:owner});
      const zeroBalance2 = await contractInstance.balances(recipient2, {from:owner});
      console.log(zeroBalance1.toString(10))
      console.log(zeroBalance2.toString(10))
      await utils.shouldThrow(contractInstance.withdraw("200", {from: recipient1}))
      await utils.shouldThrow(contractInstance.withdraw("200", {from: recipient2}))
    });

    it("Should not allow withdrawals greater than callers balance", async () => {
      const result = await contractInstance.split(recipient1, recipient2, {from: owner, value: amount});

      await contractInstance.balances(recipient1, {from: owner});

      await utils.shouldThrow(contractInstance.withdraw("501", {from: recipient1}));
      await utils.shouldThrow(contractInstance.withdraw("501", {from: recipient2}));
    });

    it("Should emit an event when withdraw is called", async () => {
      await contractInstance.split(recipient1, recipient2, {from: owner, value: amount});
      const result = await contractInstance.withdraw("500", {from: recipient1});
      assert.strictEqual(result.receipt.logs[0].event, "LogWithdrawCalled", "Withdraw event did not fire");
      assert.strictEqual(result.receipt.logs[0].args.__length__, 2, "Withdraw should have emitted one event");
      assert.strictEqual(result.receipt.logs[0].args._withdrawer, recipient1, "Bob was not the withdrawer");
      assert.strictEqual(result.receipt.logs[0].args._withdrawAmount.toString(10), "500", "Did not withdraw the correct amount");
    });

  });
  
  describe("Testing gasUsed * gasPrice", function() {

    beforeEach("Run split()", function() {
      const sendAmount = 1000;
      return contractInstance.split(recipient1, recipient2, {from: owner, value: sendAmount})
    }) 

    it("Should split multiple amongst Recipient1 & Recipient2 with txFee's taken into consideration", async () => {

      const sendAmount = 1000;

      startBalance = new BN(await web3.eth.getBalance(recipient1));

      balanceBefore = await contractInstance.balances(recipient1, {from:owner});

      const txObj = await contractInstance.withdraw("500", {from: recipient1})

      assert.strictEqual(txObj.receipt.status, true, "withdraw event was not true");

      let hash = txObj.receipt.transactionHash; 
      let tx = await web3.eth.getTransaction(hash); 
      let gasUsed = txObj.receipt.gasUsed;
      let gasPrice = tx.gasPrice;
      let txFee = new BN(gasUsed * gasPrice);
      let balanceNow = new BN(await web3.eth.getBalance(recipient1));        
      let receiveAmount = sendAmount / 2;

      assert.strictEqual(balanceNow.toString(10), startBalance.add(receiveAmount).sub(txFee).toString(10), "Bob's balance did not return as intended");

    });

  });

});