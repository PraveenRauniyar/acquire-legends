const TileBox = require('./tileBox');
const Bank = require('./bank');
const Market = require('./market.js');
const Turn = require('./turn');
const actions = require('../utils/actions.js');
const isGameOver = require('../utils/endGame.js').isGameOver;
const decidePlayerRank = require('../utils/endGame.js').decidePlayerRank;
const orderPlayers = require('../utils/orderPlayers.js').orderPlayers;


let HOTEL_DATA = require('../../data/hotelsData.json');

const INITIAL_SHARES = 25;
const INITIAL_MONEY = 100000;
const STARTING_BALANCE = 6000;
let tilebox = new TileBox(12,9);
class Game {
  constructor(maxPlayers,tileBox=tilebox,bank=new Bank(INITIAL_MONEY)) {
    this.maxPlayers=maxPlayers;
    this.minPlayers=3;
    this.players=[];
    this.tileBox = tileBox;
    this.bank=bank;
    this.MODE='wait';
    this.activityLog=[];
    this.market = new Market();
    this.actions = actions;
  }
  addPlayer(player) {
    if (this.isVacant()) {
      HOTEL_DATA.forEach(function(hotel) {
        let hotelName = hotel.name;
        player.addShares(hotelName, 0);
      });
      this.players.push(player);
      this.logActivity(`${player.name} has joined the game.`);
      return true;
    }
    return false;
  }
  addSharesToPlayer(id, hotelName, noOfShares) {
    let player = this.findPlayerById(id);
    player.addShares(hotelName, noOfShares);
  }
  canSharesBeDeployed(playerId,sharesToDeploy){
    let hotelName=sharesToDeploy.hotelName;
    let playerShares=this.findPlayerById(playerId).getShareDetails();
    return playerShares[hotelName]>=sharesToDeploy.noOfSharesToSell;
  }
  changeCurrentPlayer() {
    let tiles = this.tileBox.getTiles(1);
    let currentPlayerID = this.turn.getCurrentPlayerID();
    let currentPlayer = this.findPlayerById(currentPlayerID);
    currentPlayer.addTile(tiles[0]);
    this.turn.setState({
      expectedActions:['placeTile']
    });
    this.turn.updateTurn();
  }
  createHotels(hotels){
    hotels.forEach((hotel) => {
      this.market.createHotel(hotel);
      this.bank.createSharesOfHotel(hotel.name,INITIAL_SHARES);
    });
  }
  createMergingTurn(hotelName){
    let deployers=this.bank.getAllShareHolderIds(hotelName);
    let playerSequence=this.turn.getPlayerIdSequence();
    let currentPlayerIndex=this.turn.getCurrentPlayerIndex();
    let playersBeforeCurrentPlayer=playerSequence.slice(0,currentPlayerIndex);
    let playersFromCurrentPlayer=playerSequence.slice(currentPlayerIndex);
    let sequence=playersFromCurrentPlayer.concat(playersBeforeCurrentPlayer);
    let deployersSequence=sequence.filter((id)=>{
      return deployers.includes(Number(id));
    });
    let mergingTurn=new Turn(deployersSequence);
    this.mergingTurn=mergingTurn;
    return mergingTurn;
  }
  deductMoneyFromPlayer(playerId,money){
    let player = this.findPlayerById(playerId);
    player.deductMoney(money);
  }
  deployShares(playerId,sharesToDeploy){
    let hotelName=sharesToDeploy.hotelName;
    let state=this.turn.getState();
    let mergingHotels=state.mergingHotels;
    let currentMergingHotel=state.currentMergingHotel;
    let mergingHotelName=currentMergingHotel.name;
    let isSameHotel=(hotelName==mergingHotelName);//validate player turn
    if (isSameHotel&&this.canSharesBeDeployed(playerId,sharesToDeploy)) {
      this.letPlayerDeployShares(playerId,sharesToDeploy,state);
      let player=this.findPlayerById(playerId);
      let noOfShares=sharesToDeploy.noOfSharesToSell;
      let hotelName=sharesToDeploy.hotelName;
      this.logActivity(`${player.name} deployed ${noOfShares} of ${hotelName}`);
    }
  }
  distributeInitialMoney(initialMoney) {
    this.players.forEach(player => {
      this.distributeMoneyToPlayer(player.id, initialMoney);
      this.bank.reduceMoney(initialMoney);
    });
  }
  distributeInitialTiles() {
    let tileBox = this.tileBox;
    this.players.forEach(function(player) {
      player.addTiles(tileBox.getTiles(6));
    });
  }
  distributeMoneyToPlayer(id, money) {
    let player = this.findPlayerById(id);
    player.addMoney(money);
  }
  distributeTilesForOrdering() {
    let tileBox = this.tileBox;
    this.players.forEach(function(player) {
      player.addTiles(tileBox.getTiles(1));
    });
  }
  endMergingProcess(){
    this.mergingTurn.clearTurn();//test
    let currentGameState=this.turn.getState();
    let survivorHotel=currentGameState.survivorHotel;
    let mergingHotels=currentGameState.mergingHotels;
    this.market.addMergingHotelsToSurvivor(mergingHotels,survivorHotel);
    this.market.placeMergingTile(currentGameState.mergingTile);
    let inactiveHotels=currentGameState.inactiveHotels.concat(mergingHotels);
    mergingHotels.forEach((mergingHotel)=>{
      let hotelToRemove=undefined;
      currentGameState.inactiveHotels.concat(mergingHotels);
      hotelToRemove=currentGameState.activeHotels.indexOf(mergingHotel.name);
      currentGameState.activeHotels.splice(hotelToRemove,1);
    });
    let state={
      expectedActions:['purchaseShares'],
      status:'purchaseShares'
    };
    if (isGameOver(currentGameState.activeHotels)) {
      state.rankList=decidePlayerRank.call(this);
      state.status="gameOver";
      expectedActions:[];
    }
    this.turn.setState(state);
  }
  findPlayerById(id) {
    return this.players.find(player => {
      return player.id == id;
    });
  }
  getActivityLog(){
    return this.activityLog;
  }
  getAllHotelsDetails(){
    let hotelsData=this.market.getAllHotelsDetails();
    let availableSharesOfHotels=this.bank.getAvailableSharesOfHotels();
    hotelsData.forEach((hotel)=>{
      hotel.shares=availableSharesOfHotels[hotel.name];
    });
    return hotelsData;
  }
  getAllPlayerNames(sequence) {
    if(sequence){
      return sequence.map((id)=>{
        let player = this.findPlayerById(id);
        return player.getName();
      });
    }
    return this.players.map((player) => {
      return player.name;
    });
  }
  getAvailableCashOfPlayer(playerId){
    return this.findPlayerById(playerId).getAvailableCash();
  }
  getCurrentPlayer() {
    let currentPlayerID = this.turn.getCurrentPlayerID();
    return this.getPlayerDetails(currentPlayerID);
  }
  getHotel(hotelName){
    return this.market.getHotel(hotelName);
  }
  getPlayerCount() {
    return this.players.length;
  }
  getPlayerDetails(id) {
    let player = this.findPlayerById(id);
    return player.getDetails();
  }
  getPlayerNameById(id) {
    if (this.findPlayerById(id)) {
      return this.findPlayerById(id).name;
    }
    return '';
  }
  getStatus(playerId){
    let status={
      independentTiles:this.giveIndependentTiles(),
      hotelsData:this.getAllHotelsDetails(),
      turnDetails:this.getTurnDetails(playerId),
      gameActivityLog:this.activityLog,
      inactiveHotels:this.market.getInactiveHotels(),
      state:this.turn.getState()
    };
    return status;
  }
  getTurnDetails(id){
    let turnDetails={};
    let currentPlayerDetails=this.getCurrentPlayer();
    let state=this.turn.getState();
    if (state.status=="merge"&&state.expectedActions.includes("deployShares")) {
      turnDetails.shouldIDeploy=this.mergingTurn.isTurnOf(id);
    }
    let otherPlayers = this.getAllPlayerNames(this.turn.getPlayerIdSequence());
    turnDetails.currentPlayer = currentPlayerDetails.name;
    turnDetails.otherPlayers = otherPlayers;
    turnDetails.isMyTurn=false;
    if(currentPlayerDetails.id==id) {
      turnDetails.isMyTurn=true;
    }
    return turnDetails;
  }
  getTurnState(){
    return this.turn.getState();
  }
  giveBonus(shareHolders,totalBonus,bonusType){
    let self=this;
    let bonusAmount=totalBonus/(shareHolders.length);
    shareHolders.forEach((shareHolder)=>{
      self.distributeMoneyToPlayer(shareHolder.id,bonusAmount);
      self.logActivity(`${self.getPlayerNameById(shareHolder.id)}\
      got ${bonusAmount} as ${bonusType} bonus`);
    });
  }
  giveIndependentTiles() {
    return this.market.giveIndependentTiles();
  }
  giveMajorityMinorityBonus(hotelName){
    let shareHolders=this.bank.getShareHoldersForBonus(hotelName);
    let bonusAmounts=this.market.getBonusAmountsOf(hotelName);
    if (shareHolders.minority.length==0) {
      this.giveBonus(shareHolders.majority,bonusAmounts.majority,'majority');
      this.giveBonus(shareHolders.majority,bonusAmounts.minority,'minority');
    }else {
      this.giveBonus(shareHolders.majority,bonusAmounts.majority,'majority');
      this.giveBonus(shareHolders.minority,bonusAmounts.minority,'minority');
    }
  }
  haveAllPlayersJoined() {
    return this.maxPlayers == this.getPlayerCount();
  }
  isCurrentPlayer(playerId){
    return playerId == this.turn.getCurrentPlayerID();
  }
  isExpectedAction(action){
    return this.getTurnState().expectedActions.includes(action);
  }
  isInPlayMode() {
    return this.MODE == 'play';
  }
  isVacant() {
    return this.getPlayerCount() < this.maxPlayers;
  }
  isValidPlayer(id) {
    return this.players.some(function(player) {
      return id == player.id;
    });
  }
  letPlayerDeployShares(playerId,sharesToDeploy,state){
    let mergingHotels=state.mergingHotels;
    let currentMergingHotel=state.currentMergingHotel;
    let mergingHotelName=currentMergingHotel.name;
    let hotelName=sharesToDeploy.hotelName;
    let noOfSharesToSell=sharesToDeploy.noOfSharesToSell;
    this.playerSellsShares(playerId,noOfSharesToSell,hotelName);
    this.mergingTurn.updateTurn();
    let haveAllPlayersDeployed=(this.mergingTurn.getCurrentPlayerIndex()==0);
    let indexOfMergingHotel=mergingHotels.indexOf(currentMergingHotel);
    if (haveAllPlayersDeployed) {
      let haveAllHotelsMerged=((indexOfMergingHotel+1)==mergingHotels.length);
      if (haveAllHotelsMerged) {
        this.endMergingProcess();
      }else {
        state.currentMergingHotel=mergingHotels[indexOfMergingHotel+1];
        this.createMergingTurn(state.currentMergingHotel.name);
      }
    }
  }
  logActivity(activity){
    this.activityLog.unshift(`${new Date().toLocaleTimeString()}: ${activity}`);
  }
  performMergeAction(survivorHotels,mergingHotels,response){
    let survivorHotel=survivorHotels[0];
    response.survivorHotel=survivorHotel;
    let currentMergingHotel=mergingHotels[0];
    response.currentMergingHotel=currentMergingHotel;
    this.mergingTurn=this.createMergingTurn(currentMergingHotel.name);
    mergingHotels.forEach((mergingHotel)=>{
      this.giveMajorityMinorityBonus(mergingHotel.name);
    });
  }
  placeInitialTiles(){
    this.players.forEach((player)=>{
      let playerTile = player.getTiles()[0];
      let response=this.market.placeTile(playerTile);
      player.removeTile(playerTile);
      this.logActivity(`${player.name} has placed ${playerTile}.`);
    });
    return;
  }
  placeTile(id, tile) {
    let player = this.findPlayerById(id);
    let playerTile = player.getTile(tile);
    let response=this.market.placeTile(playerTile);
    if(response.status){
      player.removeTile(tile);
      this.setState(response);
      this.logActivity(`${player.name} has placed ${playerTile}.`);
    }
    if(isGameOver(response.activeHotels)){
      response.rankList=decidePlayerRank.call(this);
      response.status = 'gameOver';
      this.logActivity("Game has ended");
    }
    return response;
  }
  playerSellsShares(playerId,noOfSharesToSell,hotelName){
    this.bank.removeSharesOfPlayer(playerId,noOfSharesToSell,hotelName);
    let player=this.findPlayerById(playerId);
    player.removeShares(hotelName,noOfSharesToSell);
    let currentSharePrice=this.market.getSharePriceOfHotel(hotelName);
    let totalMoney=currentSharePrice*noOfSharesToSell;
    this.distributeMoneyToPlayer(playerId,totalMoney);
  }
  purchaseShares(hotelName,noOfShares,playerId){
    let player = this.findPlayerById(playerId);
    let sharePrice = this.market.getSharePriceOfHotel(hotelName);
    let cartValue = sharePrice * noOfShares;
    let hotelStatus = this.bank.doesHotelhaveEnoughShares(hotelName,noOfShares);
    let playerStatus = player.doesPlayerHasEnoughMoney(cartValue);
    if(hotelStatus && playerStatus){
      player.deductMoney(cartValue);
      this.addSharesToPlayer(playerId, hotelName, noOfShares);
      this.bank.sellSharesToPlayer(hotelName,noOfShares,playerId,cartValue);
      this.logActivity(`${player.name} has bought ${noOfShares}\
        shares of ${hotelName}.`);
    }
    return;
  }
  setState(response){
    let state=this.actions[response.status].call(this,response);
    this.turn.setState(state);
  }
  start(sequencePlayers=orderPlayers) {
    this.distributeTilesForOrdering();
    this.turn = new Turn(sequencePlayers(this.players));
    this.placeInitialTiles();
    this.distributeInitialTiles();
    this.distributeInitialMoney(STARTING_BALANCE);
    this.createHotels(HOTEL_DATA);
    this.MODE = 'play';
    this.turn.setState({
      expectedActions:['placeTile']
    });
    this.logActivity(`Game has started.`);
  }
  startHotel(hotelName,playerId){
    let tiles=this.getTurnState().tiles;
    let response=this.market.startHotel(hotelName,tiles);
    let playerName= this.getPlayerNameById(playerId);
    this.bank.giveOneFreeShare(hotelName,playerId);
    this.addSharesToPlayer(playerId,hotelName,1);
    this.setState(response);
    this.logActivity(`${playerName} has started ${hotelName} hotel.`);
    return response;
  }
  tieBreaker(survivorHotel){
    let oldResponse=this.getTurnState();
    let oldsurvivorHotels=oldResponse.survivorHotels;
    let survivorHotels=[this.getHotel(survivorHotel)];
    oldResponse.survivorHotels = survivorHotels;
    let mergingHotels = oldsurvivorHotels.filter(hotel=>{
      return !survivorHotels.includes(hotel);
    });
    mergingHotels.forEach(hotel=>{
      oldResponse.mergingHotels.push(hotel);
    });
    this.logActivity(`${this.getCurrentPlayer().name} has\
     choosen ${survivorHotel} to stay`);
    this.actions['merge'].call(this,oldResponse);
    return 200;
  }
}
module.exports = Game;
