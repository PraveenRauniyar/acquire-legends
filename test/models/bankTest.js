const assert = require('chai').assert;
const Bank = require('../../src/models/bank.js');

describe('Bank test', () => {
  describe('getAvailableCash',()=>{
    it('should return currently available cash in bank',()=>{
      let kotakMahindra=new Bank(100000);
      let actual = kotakMahindra.getAvalibleCash();
      assert.equal(actual,100000);
    });
  });
  describe('reduceMoney', function(){
    it('should reduce cash from bank',()=>{
      let kotakMahindra=new Bank(100000);
      let actual = kotakMahindra.getAvalibleCash();
      assert.equal(actual,10000);
      kotakMahindra.reduceMoney(1);
      actual = kotakMahindra.getAvalibleCash();
      assert.equal(actual,99999);
    });
  });
  describe('createSharesOfHotel', function(){
    it('should create shares of given hotel',()=>{
      let kotakMahindra=new Bank(100000);
      let expected = kotakMahindra.getAvailableSharesOfHotels();
      let actual = {};
      assert.deepEqual(actual,expected);
      kotakMahindra.createSharesOfHotel('zeta',23,200);
      expected = kotakMahindra.getAvailableSharesOfHotels();
      actual = {"zeta":23};
      assert.deepEqual(actual,expected);
    });
  });
  describe('getHotelByName', function(){
    it('should get hotel by name',()=>{
      let kotakMahindra=new Bank(100000);
      kotakMahindra.createSharesOfHotel('sackson',23);
      let actual = kotakMahindra.findHotelBy("sackson");
      let expected = {hotelName:"sackson",availableShares:23,shareHolders:[]};
      assert.deepEqual(actual,expected);
    });
  });
  describe('giveOneFreeShare', function(){
    it('should give a free share to the player who starts the hotel',()=>{
      let kotakMahindra=new Bank(100000);
      kotakMahindra.createSharesOfHotel('sackson',23);
      let actual = kotakMahindra.getAvailableSharesOfHotels();
      let expected = {"sackson":23};
      assert.deepEqual(actual,expected);
      kotakMahindra.giveOneFreeShare("sackson",0);
      actual = kotakMahindra.getShareholdersOfHotel("sackson");
      expected = [{"id":0,"noOfShares":1}];
      assert.deepEqual(actual,expected);
      actual = kotakMahindra.getAvalibleSharesOf("sackson");
      assert.equal(actual,22);
    });
  });
  describe('doesHotelhaveEnoughShares', function(){
    it('should give true if the hotel has shares to give to the player',()=>{
      let kotakMahindra=new Bank(100000);
      kotakMahindra.createSharesOfHotel('Zeta',6);
      let hotelName = 'Zeta';
      let noOfShares = 5;
      assert.isOk(kotakMahindra.doesHotelhaveEnoughShares(hotelName,noOfShares));
    });
  });
  describe('sellSharesToPlayer', function(){
    it('should return true if enough shares are there to sell a player',()=>{
      let kotakMahindra=new Bank(100000);
      kotakMahindra.createSharesOfHotel('Zeta',6);
      let hotelName = 'Zeta';
      let noOfShares = 3;
      let playerId = 1;
      let actual=kotakMahindra.sellSharesToPlayer(hotelName,noOfShares,playerId);
      assert.isOk(actual);
    });
    it('should return false if enough shares are there to sell a player',()=>{
      let kotakMahindra=new Bank(100000);
      kotakMahindra.createSharesOfHotel('Zeta',1);
      let hotelName = 'Zeta';
      let noOfShares = 3;
      let playerId = 1;
      let actual=kotakMahindra.sellSharesToPlayer(hotelName,noOfShares,playerId);
      assert.isNotOk(actual);
    });
  });
  describe('findShareHolderBy(playerId,hotelName)', function(){
    it('should ',()=>{
      let kotakMahindra=new Bank(100000);
      kotakMahindra.createSharesOfHotel('Zeta',6);
      let hotelName = 'Zeta';
      let noOfShares = 3;
      let playerId = 1;
      let actual=kotakMahindra.sellSharesToPlayer(hotelName,noOfShares,playerId);
      assert.isOk(actual);
    });
    it('should return false if enough shares are there to sell a player',()=>{
      let kotakMahindra=new Bank(100000);
      kotakMahindra.createSharesOfHotel('Zeta',1);
      let hotelName = 'Zeta';
      let noOfShares = 3;
      let playerId = 1;
      let actual=kotakMahindra.sellSharesToPlayer(hotelName,noOfShares,playerId);
      assert.isNotOk(actual);
    });
  });
  describe('removeSharesOfPlayer',()=>{
    it('it should remove shares of player',()=>{
      let kotakMahindra=new Bank(100000);
      kotakMahindra.createSharesOfHotel('Zeta',6);
      let hotelName = 'Zeta';
      let noOfShares = 3;
      let playerId = 1;
      kotakMahindra.sellSharesToPlayer(hotelName,noOfShares,playerId);
      let noOfSharesToSell=2;
      kotakMahindra.removeSharesOfPlayer(playerId,noOfSharesToSell,hotelName);
      let expectedAvailableSharesOfHotel={"Zeta":5}
      let actualHotelShares=kotakMahindra.getAvailableSharesOfHotels('Zeta');
      assert.deepEqual(expectedAvailableSharesOfHotel,actualHotelShares);
    })
  })
});
