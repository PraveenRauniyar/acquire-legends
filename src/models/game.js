const TileBox = require('./tileBox');
const Bank = require('./bank');
const Market = require('./market');
const Turn = require('./turn');
const INITIAL_SHARES = 25;
const INITIAL_MONEY = 100000;
const STARTING_BALANCE = 6000;

const HOTEL_DATA = [{
  name: 'Sackson',
  color: 'rgb(205, 61, 65)',
  level: 2
},
{
  name: 'Zeta',
  color: 'rgb(236, 222, 34)',
  level: 2
},
{
  name: 'Hydra',
  color: 'orange',
  level: 3
},
{
  name: 'Fusion',
  color: 'green',
  level: 3
},
{
  name: 'America',
  color: 'rgba(23, 60, 190, 0.79)',
  level: 3
},
{
  name: 'Phoenix',
  color: 'violet',
  level: 4
},
{
  name: 'Quantum',
  color: 'rgb(83, 161, 149)',
  level: 4
}
];
class Game {
  constructor(maxPlayers,bank=new Bank(INITIAL_MONEY)) {
    this.maxPlayers=maxPlayers;
    this.minPlayers=3;
    this.players=[];
    this.tileBox = new TileBox(12,9);
    this.bank=bank;
    this.MODE='wait';
    this.market = new Market();
    this.status = '';
    this.actions = {
      'Independent':function(response){
        response.expectedAction='buyShares';
        return response;
      },
      'Added to hotel':function(response){
        response.expectedAction='buyShares';
        return response;
      },
      'starting hotel':function(response){
        response.expectedAction='buyShares';
        let player=response.player;
        this.bank.giveOneFreeShare(response.hotelName,player.name);
        this.addSharesToPlayer(player.id,response.hotelName,1);
        return response;
      }
    };
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
  createHotels(hotelsData){
    let self=this;
    hotelsData.forEach((hotel)=>{
      this.market.createHotel(hotel);
      this.bank.createSharesOfHotel(hotel.name,INITIAL_SHARES);
    });
  }
  getHotel(hotelName){
    return this.market.getHotel(hotelName);
  }
  getPlayerDetails(id) {
    let player = this.findPlayerBy(id);
    return player.getDetails();
  }
  isInPlayMode() {
    return this.MODE == 'play';
  }
  getAllHotelsDetails(){
    let hotelsData=this.market.getAllHotelsDetails();
    let availableSharesOfHotels=this.bank.getAvailableSharesOfHotels();
    hotelsData.forEach((hotel)=>{
      hotel.shares=availableSharesOfHotels[hotel.name];
    });
    return hotelsData;
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
    let currentPlayerId = this.turn.getCurrentPlayerID();
    let player = this.findPlayerBy(id);
    if(this.status=='place tile'&& currentPlayerId == id){
      let playerTile = player.getTile(tile);
      let response=this.market.placeTile(playerTile);
      console.log(response);
      if(response.status){
        player.removeTile(tile);
        response.player=player;
        let state=this.actions[response.status].call(this,response);
        this.turn.setState(state);
        this.status = 'buy shares';
      }
      return response;
    }
    // return this.turn.getState();
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
  isCurrentPlayer(playerId){
    return playerId == this.turn.getCurrentPlayerID();
  }
  changeCurrentPlayer() {
    let tiles = this.tileBox.getNTiles(1);
    let currentPlayerID = this.turn.getCurrentPlayerID();
    let currentPlayer = this.findPlayerBy(currentPlayerID);
    currentPlayer.addTile(tiles[0]);
    this.status = 'place tile';
    this.turn.updateTurn();
  }
  getTurnDetails(id){
    let turnDetails={};
    let currentPlayer=this.getCurrentPlayer();
    let otherPlayers=this.getAllPlayerDetails().filter((player)=>{
      return currentPlayer.id!=player.id;
    });
    turnDetails.currentPlayer = currentPlayer.name;
    turnDetails.otherPlayers = otherPlayers.map((player)=>{
      return player.name;
    });
    turnDetails.isMyTurn=false;
    if(currentPlayer.id==id) {
      turnDetails.isMyTurn=true;
    }
    return turnDetails;
  }
  getStatus(playerId){
    return {
      independentTiles:this.giveIndependentTiles(),
      hotelsData:this.getAllHotelsDetails(),
      turnDetails:this.getTurnDetails(playerId)
    };
  }
}
module.exports = Game;
