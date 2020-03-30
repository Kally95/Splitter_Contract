import React, { Component } from "react";
import getWeb3 from "./getWeb3";
import Splitter from "./contracts/Splitter.json";
import "./App.css";

class App extends Component {
  
  constructor(props) {
    super(props)
    this.state = { 
      web3: null,
      address: null,
      accounts: null,
      contract: null,
      amount: 0,
      recipient1: null,
      recipient2: null,
      txReceipt: '',
      txHash: '',
      withdrawAmt: 0,
      contractBal: 0
    }
  }

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();
      
      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = Splitter.networks[networkId];
      const instance = new web3.eth.Contract(
        Splitter.abi,
        deployedNetwork && deployedNetwork.address,
      );
      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ 
        web3, accounts, contract: instance, address: deployedNetwork.address }, () => {
        this.handleContractBalance();
      });
     
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  handleInput = (event) => {
    this.setState({ [event.target.name]: event.target.value });
  };

  handleSplit = async () => {
    let { accounts, contract, recipient1, recipient2, amount, web3 } = this.state;
    const ethAmount = web3.utils.toWei(amount, 'ether');
    
    try {
      const splitSuccess = await contract.methods.split(
        recipient1,
        recipient2
      ).call({
        from: accounts[0],
        value: ethAmount
      })

      if (splitSuccess) {
        await contract.methods.split(
          recipient1,
          recipient2
        ).send({
        from: accounts[0],
        value: ethAmount,
        })
        .on('transactionHash', txHash => this.setState({ txHash: txHash }))
        .on('receipt', receipt => this.setState({ txReceipt: receipt}))
      } else {
        alert('Split unsuccessful.')
      }
    } catch(err) {
        console.log(err)
    }
  }

  handleWithdraw = async () => {
    let { accounts, contract, web3, withdrawAmt } = this.state;
    let amount = web3.utils.toWei(withdrawAmt, "ether");
    try {
      const withdrawSuccess = await contract.methods
      .withdraw(amount)
      .call({
      from: accounts[0]
    });

      if(withdrawSuccess) {
        await contract.methods
          .withdraw(amount)
          .send({
          from: accounts[0]
        })
        .on('transactionHash', txHash => this.setState({ txHash: txHash }))
        .on('receipt', receipt => this.setState({ txReceipt: receipt}))
      } else {
        alert('Withdraw Unsuccessful')
      }
      
    } catch(err) {
      console.log(err)
    }
  }

  handleContractBalance = async () => {
    let { web3, address } = this.state;
    let balance = await web3.eth.getBalance(
      address
    );
    let contractBalance = web3.utils.fromWei(balance, 'ether');
    this.setState({ contractBal: contractBalance});
  }
  
  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    
    return (
      <div className="App">
        <h1><u>SPLITTER</u></h1>
        <p>Contract Balance: <span class="badge badge-secondary">{this.state.contractBal}</span> ETH </p>
        <form className="split-form">
        <h4>Split Form</h4>
        <hr></hr>
        <div className="form-contents">
          <label htmlFor="recipient1">Recipient 1: </label>
          <input
            autoComplete="off"
            name="recipient1"
            className="form-control"
            id="recipient1"
            onChange={this.handleInput}
          />
          <label htmlFor="receipient2">Recipient 2: </label>
          <input
            autoComplete="off"
            name="recipient2"
            className="form-control"
            id="recipient2"
            onChange={this.handleInput}
          />
          <label htmlFor="amount">Split Amount (Ξ): </label>
          <input
            autoComplete="off"
            name="amount"
            className="form-control"
            id="amount"
            onChange={this.handleInput}
          />
        </div>
        <div class="alert alert-success" role="alert">
          <p className="tx-hash-alert"><u>Withdraw Tx Hash</u>: {this.state.txHash}</p>
        </div>
        </form>
        <div className="buttons-container">
          <button 
          className="btn btn-primary"
          onClick={this.handleSplit}>
          SPLIT ✂️
          </button>

          <button 
          htmlFor="withdrawAmt"
          className="btn btn-success"
          onClick={this.handleWithdraw}>
            WITHDRAW 💰
          </button>

          <input 
            autoComplete="off"
            name="withdrawAmt"
            className="form-control"
            id="withdrawAmt"
            onChange={this.handleInput}
          />
        </div>
    </div>
    );
  }
}

export default App;