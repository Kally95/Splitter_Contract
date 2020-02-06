var SimpleStorage = artifacts.require("./SimpleStorage.sol");
var Splitter = artifacts.require('Splitter');

module.exports = function(deployer) {
  deployer.deploy(SimpleStorage);
  deployer.deploy(Splitter);
};
