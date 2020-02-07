import React, { Component } from "react";
import getWeb3 from "./getWeb3";
import Splitter from "./contracts/Splitter.json";
import "./App.css";

class App extends Component {
  
  constructor(props) {
    super(props)
    this.state = { 
      web3: null,
      accounts: null,
      contract: null,
      amount: 0,
      recipient1: null,
      recipient2: null,
      recipient1Bal: 0,
      recipient2Bal:0,
      withdrawAmt: 0
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
      this.setState({ web3, accounts, contract: instance }, this.runExample);
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
    const ethAmount = web3.utils.toWei(amount);
    try {
      await contract.methods.split(
        recipient1,
        recipient2
      ).send({
      from: accounts[0],
      value: ethAmount
      })
    } catch(err) {
      console.log(err)
    }
  }

  handleWithdraw = async () => {
    let { accounts, contract, withdrawAmount, web3 } = this.state;
    let withdrawAmt = web3.utils.toWei(withdrawAmount, 'ether')
    await contract.methods.withdraw(
      withdrawAmt
    ).send({
      from: accounts[0]
    })
  }
  // handleRecipient1Bal = async () => {
  //   let { accounts, contract, recipient1Bal, recipient1 } = this.state;
  //   let balance = await contract.methods.balances(
  //     recipient1,
  //     {from: accounts[0]}
  //   )
  //   this.setState({ recipient1Bal: balance })
  // }

  // handleRecipient1Bal = async () => {
    
  // }

  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <div className="App">  
        <h1>Splitter</h1>
        <p>Recip1 Bal: { this.state.recipient1Bal } </p>
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
        </form>
        <button onClick={this.handleSplit}>
        Split
        </button>

        <button onClick={this.handleWithdraw}>
          Withdraw
        </button>
        <input 
          autoComplete="off"
          name="withdrawAmt"
          className="form-control"
          id="withdrawAmt"
          onChange={this.handleInput}
        />
    </div>
    );
  }
}

export default App;