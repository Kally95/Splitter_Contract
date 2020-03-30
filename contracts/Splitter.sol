pragma solidity ^0.5.0;

import "./Stoppable.sol";
import "./SafeMath.sol";

contract Splitter is Stoppable {

    using SafeMath for uint256;

    event LogSplit(
        address indexed sender,
        address indexed recipient,
        address indexed recipient2,
        uint splitAmount,
        uint splitRemainder
    );

    event LogWithdrawCalled(address indexed withdrawer, uint indexed withdrawAmount);

    event LogKilledWithdraw(address indexed owner, uint indexed contractAmount);

    mapping(address => uint256) public balances;

    constructor()
    public
    {

    }

    function split(address recipient1, address recipient2)
    public
    payable
    whenRunning
    whenAlive
    returns(bool)
    {
        require(recipient1 != address(0x0) && recipient2 != address(0x0), "Error: Address cannot be 0");
        require(msg.value > 0, "Error: Value can not equal 0");
        require(recipient1 != recipient2);

        uint256 splitAmount = msg.value.div(2);
        uint256 splitRemainder;

        if (msg.value % 2 != 0) {
            splitRemainder = msg.value.mod(2);
            balances[msg.sender] = balances[msg.sender].add(splitRemainder);
        }
        
        balances[recipient1] = balances[recipient1].add(splitAmount);
        balances[recipient2] = balances[recipient2].add(splitAmount);

        emit LogSplit(msg.sender, recipient1, recipient2, splitAmount, splitRemainder);
        return true;
    }


    function withdraw(uint withdrawAmount)
    public
    whenRunning
    whenAlive
    {
        uint balance = balances[msg.sender];
        require(withdrawAmount != 0, "Error: Withdraw amount must be > 0");
        require(withdrawAmount <= balances[msg.sender], "Error: Insufficient balance");
        balances[msg.sender] = balance.sub(withdrawAmount);
        emit LogWithdrawCalled(msg.sender, withdrawAmount);
        (bool success, ) = msg.sender.call.value(withdrawAmount)("");
        require(success, "Error: Transfer failed.");
    }

    function withdrawWhenKilled()
    public
    whenKilled
    onlyOwner
    {
        require(address(this).balance > 0, "Error: The contract is empty");
        emit LogKilledWithdraw(msg.sender, address(this).balance);
        (bool success, ) = msg.sender.call.value(address(this).balance)("");
        require(success, "Error: Transfer failed.");
    }

}
