import React, { Component } from "react";
import Splitter from "./contracts/Splitter.json";
import getWeb3 from "./getWeb3";

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
      recipient2: null
    }
  }
  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();
      console.log(web3)
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

  // runExample = async () => {
  //   const { accounts, contract } = this.state;

  //   // Stores a given value, 5 by default.
  //   await contract.methods.set(5).send({ from: accounts[0] });

  //   // Get the value from the contract to prove it worked.
  //   const response = await contract.methods.get().call();

  //   // Update state with the result.
  //   this.setState({ storageValue: response });
  // };

  handleSplit = async () => {
    let { accounts, contract, recipient1, recipient2, amount } = this.state;
    try {
      await contract.methods.split(
        recipient1,
        recipient2
      ).send({
      from: accounts[0],
      value: amount 
      })
    } catch(err) {
      console.log(err)
    }
  }

  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <div className="App">  
      <h1>Splitter</h1>
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
          <button onClick={this.handleSplit} variant="contained" color="primary">
          Split
          </button>
    </div>
    );
  }
}

export default App;
