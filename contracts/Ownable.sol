pragma solidity ^0.5.0;

contract Ownable {
    
    address private owner; // **implemented** made as payable to replace owner in Splitter contract
  
    event OwnershipTransferred(address newOwner); // Added event
    
    constructor() public
    {
        owner = msg.sender;
    }
    
    modifier onlyOwner() 
    {
        require(msg.sender == owner, "Error: msg.sender must be owner");
        _;
    }
    
    function getOwner() 
    public
    view 
    returns (address _owner) {
        return owner;
    }
    
    function
    setOwner(address newOwner) // **implemented** declared input paramater as payable
    public
    onlyOwner
    returns(bool success)
    {
        require(newOwner != address(0x0), "Error: Address cannot be 0");
        emit OwnershipTransferred(newOwner); //<-***implemented*** added emit
        owner = newOwner;
        return true; 
    }

}
