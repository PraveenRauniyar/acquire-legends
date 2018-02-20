const TileBox = require('./tileBox');
const Bank = require('./bank');
const Hotel = require('./hotel');
const Market = require('./market');
const Turn = require('./turn');
const INITIAL_SHARES = 25;
const INITIAL_MONEY = 100000;
const STARTING_BALANCE = 6000;

const HOTEL_DATA = [{
  name: 'Sackson',
  color: 'rgb(205, 61, 65)'
},
{
  name: 'Zeta',
  color: 'rgb(236, 222, 34)'
},
{
  name: 'Hydra',
  color: 'orange'
},
{
  name: 'Fusion',
  color: 'green'
},
{
  name: 'America',
  color: 'rgb(23, 60, 190)'
},
{
  name: 'Phoenix',
  color: 'violet'
},
{
  name: 'Quantum',
  color: 'rgb(83, 161, 149)'
}
];
class Game {
  constructor(maxPlayers, bank = new Bank(INITIAL_MONEY)) {
    this.maxPlayers = maxPlayers;
    this.minPlayers = 3;
    this.players = [];
    this.hotels = [];
    this.tileBox = new TileBox(12, 9);
    this.bank = bank;
    this.MODE = 'wait';
    this.market = new Market();
    this.status = '';
  }
  isVacancy() {
    return this.getPlayerCount() < this.maxPlayers;
  }
  addPlayer(player) {
    if (this.isVacancy()) {
      HOTEL_DATA.forEach(function(hotel) {
        let hotelName = hotel.name;
        player.addShares(hotelName, 0);
      });
      this.players.push(player);
      return true;
    }
    return false;
  }
  getPlayerCount() {
    return this.players.length;
  }
  haveAllPlayersJoined() {
    return this.maxPlayers == this.getPlayerCount();
  }
  findPlayerBy(id) {
    return this.players.find(player => {
      return player.id == id;
    });
  }
  getPlayerNameOf(id) {
    if (this.findPlayerBy(id)) {
      return this.findPlayerBy(id).name;
    }
    return '';
  }
  disrtibuteMoneyToPlayer(id, money) {
    let player = this.findPlayerBy(id);
    player.addMoney(money);
  }
  getAvailableCashOf(id) {
    let player = this.findPlayerBy(id);
    return player.getAvailableCash();
  }
  distributeInitialMoney(initialMoney) {
    this.players.forEach(player => {
      this.disrtibuteMoneyToPlayer(player.id, initialMoney);
      this.bank.reduceMoney(initialMoney);
    });
  }
  isValidPlayer(id) {
    return this.players.some(function(player) {
      return id == player.id;
    });
  }
  distributeInitialTiles() {
    let tileBox = this.tileBox;
    this.players.forEach(function(player) {
      player.addTiles(tileBox.getNTiles(6));
    });
  }
  start() {
    this.distributeInitialTiles();
    this.distributeInitialMoney(STARTING_BALANCE);
    this.createHotels(HOTEL_DATA);
    this.turn = new Turn(this.getPlayersOrder());
    this.MODE = 'play';
    this.status = 'place tile';
  }
  createHotels(hotelsData) {
    let self = this;
    hotelsData.forEach(function(hotelInfo) {
      let hotel = new Hotel(hotelInfo.name, hotelInfo.color);
      self.bank.createSharesOfHotel(hotel.name, INITIAL_SHARES);
      hotel.shares = self.bank.getAvalibleSharesOf(hotel.name);
      self.hotels.push(hotel);
    });
  }
  getHotel(hotelName) {
    return this.hotels.find(hotel => {
      return hotel.getName() == hotelName;
    });
  }
  getPlayerDetails(id) {
    let player = this.findPlayerBy(id);
    return player.getDetails();
  }
  isInPlayMode() {
    return this.MODE == 'play';
  }
  getAllHotelsDetails() {
    return this.hotels;
  }
  getAllPlayerNames() {
    return this.players.map((player) => {
      return player.name;
    });
  }
  addSharesToPlayer(id, hotelName, noOfShares) {
    let player = this.findPlayerBy(id);
    player.addShares(hotelName, noOfShares);
  }
  getPlayerSharesDetails(id) {
    let player = this.findPlayerBy(id);
    return player.getShareDetails();
  }
  placeTile(id, tile) {
    let player = this.findPlayerBy(id);
    if(this.status=='place tile'){
      let playerTile = player.getTile(tile);
      this.market.placeAsIndependentTile(playerTile);
      this.status = 'buy shares';
    }
    return;
  }
  giveIndependentTiles() {
    return this.market.giveIndependentTiles();
  }
  getPlayersOrder() {
    return this.players.map((player) => {
      return player.id;
    });
  }
  getAllPlayerDetails() {
    return this.players.map((player) => {
      return player.getDetails();
    });
  }
  getCurrentPlayer() {
    let currentPlayerID = this.turn.getCurrentPlayerID();
    return this.getPlayerDetails(currentPlayerID);
  }
  changeCurrentPlayer() {
    let tiles = this.tileBox.getNTiles(1);
    let currentPlayerID = this.turn.getCurrentPlayerID();
    let currentPlayer = this.findPlayerBy(currentPlayerID);
    currentPlayer.addTile(tiles[0]);
    this.status = 'place tile';
    this.turn.updateTurn();
  }
}
module.exports = Game;
