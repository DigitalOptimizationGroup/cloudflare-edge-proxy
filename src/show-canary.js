import uniformIndex from "./assign-uniform";

// allocation int from 0 - 100,
module.exports = (fullSalt, allocation = 0) =>
    allocation > 0
        ? // e.g. if allocation is 3 and modulo could return 0 - 99, if it returns
          //  [0,1,2] then we should show canary
          uniformIndex(fullSalt, 100) < allocation
        : false;
