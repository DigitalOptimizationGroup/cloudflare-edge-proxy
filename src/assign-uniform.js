import sha1 from "sha1";
const BigNumber = require("bignumber.js");

export default (fullSalt, numItems) =>
    new BigNumber(sha1(fullSalt).substr(0, 15), 16).modulo(numItems).toNumber();
