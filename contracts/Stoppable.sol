pragma solidity ^0.5.0;

import "./Ownable.sol";

contract Stoppable is Ownable {


    bool private stopped;
    bool private killed;

    event LogStopped(address _owner); //<-***implemented*** Changed name of event
    event LogResumed(address _owner);
    event LogKilled(address _killer);
    
    constructor()
    internal
    {
        stopped = false;
        killed = false;
    }
    
    modifier
    whenKilled()
    {
        require (killed, "Contract is alive");
        _;
    }
    
    modifier
    whenAlive()
    {
        require(!killed, "Contract is dead");
        _;
    }

    modifier 
    whenRunning()
    { 
        require(!stopped, "Contract is paused."); // _stopped = true -> !true
        _;
    }
    
    modifier 
    whenPaused()
    {
        require(stopped, "Contract is running"); //<-***implemented*** 
        _; 
    }
   
    function stop()
    public
    onlyOwner
    whenAlive
    whenRunning //<-***implemented*** changed to 'whenRunning'
    {
        stopped = true;
        emit LogStopped(msg.sender); // Added emit
    }

    function resume()
    public
    onlyOwner
    whenAlive
    whenPaused //<-***implemented*** can only resume whenPaused
    {
        stopped = false;
        emit LogResumed(msg.sender); // Added emit 
    }

    function kill()
    public
    onlyOwner
    whenAlive
    whenPaused // Requires contrac to be paused
    //before it can be killed
    {
        killed = true;
        emit LogKilled(msg.sender);
    }

}
