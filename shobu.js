const inquirer = require('inquirer');

const EMPTY_SPACE = "-";
const BLACK_STONE = "O";
const WHITE_STONE = "X";
const QUADRANTS = ["botLeft", "botRight", "topLeft", "topRight"];

console.log('\033[2J');
console.log("Shobu!");
console.log();
console.log("To begin, enter your passive move in the following format: {quadrant},{startTile},{endtile}");
console.log();
process.stdout.write("The quadrants are:\n- topLeft\n- topRight\n- botLeft\n- botRight\n");
console.log();
process.stdout.write("Here are some move examples:\n- botLeft,D4,B2\n- topRight,A1,C1\n");
console.log();

var gameboard = {
	botLeft: createArray(4, 4),
	botRight: createArray(4, 4),
	topLeft: createArray(4, 4),
	topRight: createArray(4, 4),
};
var playerCount;
var opponent;


fillGameboard(gameboard);
drawGameboard(gameboard);

beginGame();

async function beginGame() {
	promptForPlayerCount().then(answers => {

		playerCount = answers.gameType === 'vs AI' ? 1 : 2;

		console.log("answered with ", playerCount)
		if( playerCount === 1 ){
			opponent = new Opponent();
			opponent.taunt();
		}
	
		promptForMove("Black");
	});
}

async function promptForPlayerCount(){
	var questions = [
		{
			type: 'list',
			name: 'gameType',
			message: 'How would you like to play?',
			choices: ['vs AI', 'vs Another Human'],
		}
	]

	return inquirer.prompt(questions)
}

function promptForMove(whoseTurn) {
	var questions = [
		{
	  		type: 'input',
	  		name: 'passiveMove',
	  		message: whoseTurn + ", enter your passive move: ",
	  		validate: function(value) {
	  			var parsedInput = value.split(",");
				var validated = validatePassiveMove(parsedInput, whoseTurn);
				if (validated === true) {
					updateGameboardWithMove(parsedInput, whoseTurn);
					console.log('\033[2J');
					drawGameboard(gameboard);
					return true;
				} else {
					return validated;
				}
	  		}
		},
		{
			type: 'list',
	  		name: 'aggresiveMove',
	  		message: whoseTurn + ", choose your aggresive move: ",
	  		choices: function(answers) { 
	  			var parsedInput = answers['passiveMove'].split(",");
	  			return buildAggresiveMovesFromPassiveMove(parsedInput, whoseTurn);
	  		}
		}
	]

	inquirer.prompt(questions).then(answers => {

	  updateGameboardWithAggresiveMove(answers['aggresiveMove'].split(","), whoseTurn);
	  console.log('\033[2J');
	  drawGameboard(gameboard);

	  if (scanForWin(gameboard.topLeft) || scanForWin(gameboard.topRight) || scanForWin(gameboard.botLeft) || scanForWin(gameboard.botRight)) {
	  	console.log(whoseTurn + " wins!");
	  	process.exit();
	  } else {
		  if (whoseTurn === "Black"){
			if (playerCount === 1){
				opponent.takeTurn({ callBack: () => promptForMove("Black") });
			} else {
				promptForMove("White")
			}
		  } else {
			promptForMove("Black")
		  }
	  }
	});
}

function updateGameboardWithMove(moveParsed, whoseTurn) {
	var quadrant = moveParsed[0];
	var moveStart = moveParsed[1];
	var moveEnd = moveParsed[2];
	var turnLetter = (whoseTurn === "Black") ? BLACK_STONE : WHITE_STONE;

	var shobu = gameboard[quadrant];
	shobu[getRow(moveStart)][getColumn(moveStart)] = "-";
	shobu[getRow(moveEnd)][getColumn(moveEnd)] = turnLetter;

	gameboard[quadrant] = shobu;	
}

function updateGameboardWithAggresiveMove(moveParsed, whoseTurn) {
	var quadrant = moveParsed[0];
	var moveStart = moveParsed[1];
	var moveEnd = moveParsed[2];
	var turnLetter = (whoseTurn === "Black") ? BLACK_STONE : WHITE_STONE;
	var shobu = gameboard[quadrant];

	var validate = validateAggresiveMove(moveParsed, whoseTurn);
	if (validate.push) {
		shobu[getRow(validate.push.end)][getColumn(validate.push.end)] = validate.push.stone;
		shobu[getRow(moveStart)][getColumn(moveStart)] = "-";
		shobu[getRow(moveEnd)][getColumn(moveEnd)] = turnLetter;
	} else {
		shobu[getRow(moveStart)][getColumn(moveStart)] = "-";
		shobu[getRow(moveEnd)][getColumn(moveEnd)] = turnLetter;
	}

	if (validate.doublePush) {
		shobu[getRow(validate.doublePush)][getColumn(validate.doublePush)] = "-";
	}

	gameboard[quadrant] = shobu;
}

function validatePassiveMove(parsedInput, whoseTurn) {
	var quadrant = parsedInput[0];
	var moveStart = parsedInput[1];
	var moveEnd = parsedInput[2];

	if (quadrant === undefined || moveStart === undefined || moveEnd === undefined) {
		return "Invalid input";
	}

	var isQuadrantResult = isQuadrant(quadrant);
	if (typeof isQuadrantResult === 'string') {
		return isQuadrantResult;
	}

	var isMoveStartValidResult = isMoveStartValid(quadrant, moveStart, whoseTurn);
	if (typeof isMoveStartValidResult === 'string') {
		return isMoveStartValidResult;
	}

	var isMoveEndValidResult = isMoveEndValid(quadrant, moveStart, moveEnd, whoseTurn);
	if (typeof isMoveEndValidResult === 'string') {
		return isMoveEndValidResult;
	}

	var aggresiveMoves = buildAggresiveMovesFromPassiveMove(parsedInput, whoseTurn);
	if (aggresiveMoves.length === 0) {
		return "No aggresive move can be made from passive move.";
	}
		
	return true;
}

function validateAggresiveMove(parsedInput, whoseTurn) {
	var quadrant = parsedInput[0];
	var moveStart = parsedInput[1];
	var moveEnd = parsedInput[2];
	var friendlyStone = whoseTurn === "Black" ? BLACK_STONE : WHITE_STONE
	var enemyStone = whoseTurn === "Black" ? WHITE_STONE : BLACK_STONE

	var shobu = gameboard[quadrant];
	var vector = getVectorFromMove(moveStart, moveEnd);

	// Only moving one space
	if (Math.abs(vector.colMag) <= 1 && Math.abs(vector.rowMag) <= 1){
		var stoneAtEndLocation = shobu[getRow(moveEnd)][getColumn(moveEnd)];
		if (stoneAtEndLocation === EMPTY_SPACE) {
			return {valid: true};
		}

		if (stoneAtEndLocation === friendlyStone) {
			return "Cannot push stones of the same color";
		} else {
			var direction = getDirectionFromVector_one(vector);
			var newPushedStoneLocation = getPushedStoneNewLocation(getRow(moveEnd), getColumn(moveEnd), direction);
			if (convertToGrid(newPushedStoneLocation.row, newPushedStoneLocation.col).includes("not")) {
				return {valid: true};
			} else if (shobu[newPushedStoneLocation.row][newPushedStoneLocation.col] !== EMPTY_SPACE) {
				return "Cannot push stone into another stone";
			} else {
				return {valid: true, push: {stone: enemyStone, end: convertToGrid(newPushedStoneLocation.row, newPushedStoneLocation.col)}};
			}
		}
	// Moving two spaces
	} else {
		var direction = getDirectionFromVector_two(vector);
		var moveMiddleIndex = getPushedStoneNewLocation(getRow(moveStart), getColumn(moveStart), direction);
		var moveMiddle = convertToGrid(moveMiddleIndex.row, moveMiddleIndex.col);
		var stoneAtMiddleLocation = shobu[getRow(moveMiddle)][getColumn(moveMiddle)];
		var stoneAtFinalLocation = shobu[getRow(moveEnd)][getColumn(moveEnd)];

		// Look at middle move
		if (stoneAtMiddleLocation === friendlyStone) {
			return "Cannot push stones of the same color";
		} else if (stoneAtMiddleLocation === enemyStone) {
			var newPushedStoneMiddleLocation = getPushedStoneNewLocation(getRow(moveMiddle), getColumn(moveMiddle), direction);				
			if (convertToGrid(newPushedStoneMiddleLocation.row, newPushedStoneMiddleLocation.col).includes("not")) {					
				return "Something went wrong, we should not be at the edge here...";
			} else if (shobu[newPushedStoneMiddleLocation.row][newPushedStoneMiddleLocation.col] !== EMPTY_SPACE) {					
				return "Cannot push stone into another stone";
			} else {
				var newPushedStoneEndLocation = getPushedStoneNewLocation(getRow(moveEnd), getColumn(moveEnd), direction);
				if (convertToGrid(newPushedStoneEndLocation.row, newPushedStoneEndLocation.col).includes("not")) {						
					return {valid: true, doublePush: moveMiddle};
				} else if (shobu[newPushedStoneEndLocation.row][newPushedStoneEndLocation.col] !== EMPTY_SPACE) {						
					return "Cannot push stone into another stone";
				} else {						
					return {
						valid: true, 
						push: {stone: enemyStone, end: convertToGrid(newPushedStoneEndLocation.row, newPushedStoneEndLocation.col)},
						doublePush: moveMiddle
					};
				}
			}
		} else {
			if (stoneAtFinalLocation === "-") {					
				return {valid: true};
			}

			if (stoneAtEndLocation === friendlyStone) {					
				return "Cannot push stones of the same color";
			} else {
				var newPushedStoneLocation = getPushedStoneNewLocation(getRow(moveEnd), getColumn(moveEnd), direction);
				if (convertToGrid(newPushedStoneLocation.row, newPushedStoneLocation.col).includes("not")) {						
					return {valid: true};
				} else if (shobu[newPushedStoneLocation.row][newPushedStoneLocation.col] !== EMPTY_SPACE) {						
					return "Cannot push stone into another stone";
				} else {						
					return {valid: true, push: {stone: enemyStone, end: convertToGrid(newPushedStoneLocation.row, newPushedStoneLocation.col)}};
				}
			}
		}
	}
}

function getPushedStoneNewLocation(row, col, direction) {
	var newStoneLocation;
	if (direction === "left") {
		newStoneLocation = {row: row, col: col - 1};
	} else if (direction === "right") {
		newStoneLocation = {row: row, col: col + 1};
	} else if (direction === "up") {
		newStoneLocation = {row: row - 1, col: col};
	} else if (direction === "upLeft") {
		newStoneLocation = {row: row - 1, col: col - 1};
	} else if (direction === "upRight") {
		newStoneLocation = {row: row - 1, col: col + 1};
	} else if (direction === "down") {
		newStoneLocation = {row: row + 1, col: col};
	} else if (direction === "downLeft") {
		newStoneLocation = {row: row + 1, col: col - 1};
	} else {
		newStoneLocation = {row: row + 1, col: col + 1};
	}

	return newStoneLocation;
}

function getDirectionFromVector_one(vector) {
	if (vector.rowMag === 0 && vector.colMag === 1) {
		return "left";
	} else if (vector.rowMag === 0 && vector.colMag === -1) {
		return "right";
	} else if (vector.rowMag === 1 && vector.colMag === 0) {
		return "up";
	} else if (vector.rowMag === -1 && vector.colMag === 0) {
		return "down";
	} else if (vector.rowMag === 1 && vector.colMag === 1) {
		return "upLeft";
	} else if (vector.rowMag === 1 && vector.colMag === -1) {
		return "upRight";
	} else if (vector.rowMag === -1 && vector.colMag === 1) {
		return "downLeft";
	} else {
		return "downRight";
	}
}

function getDirectionFromVector_two(vector) {
	if (vector.rowMag === 0 && vector.colMag === 2) {
		return "left";
	} else if (vector.rowMag === 0 && vector.colMag === -2) {
		return "right";
	} else if (vector.rowMag === 2 && vector.colMag === 0) {
		return "up";
	} else if (vector.rowMag === -2 && vector.colMag === 0) {
		return "down";
	} else if (vector.rowMag === 2 && vector.colMag === 2) {
		return "upLeft";
	} else if (vector.rowMag === 2 && vector.colMag === -2) {
		return "upRight";
	} else if (vector.rowMag === -2 && vector.colMag === 2) {
		return "downLeft";
	} else {
		return "downRight";
	}
}

function buildAggresiveMovesFromPassiveMove(passiveMoveParsed, whoseTurn) {
	var quadrant = passiveMoveParsed[0];
	var moveStart = passiveMoveParsed[1];
	var moveEnd = passiveMoveParsed[2];

	var vector = getVectorFromMove(moveStart, moveEnd);

	if (quadrant === "botLeft") {
		var botRightStoneLocations = getStoneLocations("botRight", whoseTurn);
		var topRightStoneLocations = getStoneLocations("topRight", whoseTurn);

		var choices = [];
		botRightStoneLocations.forEach((location) => {
			var endLocation = getEndFromStartAndVector(location, vector);
			if (!endLocation.includes("not")) {
				choices.push(`botRight,${location},${endLocation}`);
			}
		});

		topRightStoneLocations.forEach((location) => {
			var endLocation = getEndFromStartAndVector(location, vector);
			if (!endLocation.includes("not")) {
				choices.push(`topRight,${location},${endLocation}`);
			}
		});
	} else if (quadrant === "botRight") {
		var botLeftStoneLocations = getStoneLocations("botLeft", whoseTurn);
		var topLeftStoneLocations = getStoneLocations("topLeft", whoseTurn);

		var choices = []; 
		botLeftStoneLocations.forEach((location) => {
			var endLocation = getEndFromStartAndVector(location, vector);
			if (!endLocation.includes("not")) {
				choices.push(`botLeft,${location},${endLocation}`);
			}
		});

		topLeftStoneLocations.forEach((location) => {
			var endLocation = getEndFromStartAndVector(location, vector);
			if (!endLocation.includes("not")) {
				choices.push(`topLeft,${location},${endLocation}`);
			}
		});
	} else if (quadrant === "topLeft") {
		var botRightStoneLocations = getStoneLocations("botRight", whoseTurn);
		var topRightStoneLocations = getStoneLocations("topRight", whoseTurn);

		var choices = [];
		botRightStoneLocations.forEach((location) => {
			var endLocation = getEndFromStartAndVector(location, vector);
			if (!endLocation.includes("not")) {
				choices.push(`botRight,${location},${endLocation}`);
			}
		});

		topRightStoneLocations.forEach((location) => {
			var endLocation = getEndFromStartAndVector(location, vector);
			if (!endLocation.includes("not")) {
				choices.push(`topRight,${location},${endLocation}`);
			}
		});
	} else {
		var botLeftStoneLocations = getStoneLocations("botLeft", whoseTurn);
		var topLeftStoneLocations = getStoneLocations("topLeft", whoseTurn);

		var choices = [];
		botLeftStoneLocations.forEach((location) => {
			var endLocation = getEndFromStartAndVector(location, vector);
			if (!endLocation.includes("not")) {
				choices.push(`botLeft,${location},${endLocation}`);
			}
		});

		topLeftStoneLocations.forEach((location) => {
			var endLocation = getEndFromStartAndVector(location, vector);
			if (!endLocation.includes("not")) {
				choices.push(`topLeft,${location},${endLocation}`);
			}
		});
	}

	var newChoices = [];
	choices.forEach((choice) => {
		var validate = validateAggresiveMove(choice.split(","), whoseTurn);
		if (validate.valid === true) {
			newChoices.push(choice);
		}
	});

	return newChoices;
}

function getEndFromStartAndVector(start, vector) {
	var row = getRow(start);
	var col = getColumn(start);

	return convertToGrid(row - vector.rowMag, col - vector.colMag);
}

function getStoneLocations(quadrant, whoseTurn) {
	var shobu = gameboard[quadrant];
	var stoneLetter = (whoseTurn === "Black") ? BLACK_STONE : WHITE_STONE;

	var locations = [];

	shobu.forEach((row, rowIndex) => {
		row.forEach((tile, colIndex) => {
			if (tile === stoneLetter) {
				locations.push(convertToGrid(rowIndex, colIndex));
			}
		})
	}) 

	return locations;
}

function getVectorFromMove(moveStart, moveEnd) {
	var rowMag = getRow(moveStart) - getRow(moveEnd);
	var colMag = getColumn(moveStart) - getColumn(moveEnd); 
	return {rowMag, colMag};
}

function convertToGrid(row, tile) {
	var finalGridString = "";

	if (row === 0) {
		finalGridString += "A";
	} else if (row === 1) {
		finalGridString += "B";
	} else if (row === 2) {
		finalGridString += "C";
	} else if (row === 3) {
		finalGridString += "D";
	} else {
		return "Could not convert to grid! " + row + "," + tile;
	}

	if (tile === 0) {
		finalGridString += "1";
	} else if (tile === 1) {
		finalGridString += "2";
	} else if (tile === 2) {
		finalGridString += "3";
	} else if (tile === 3) {
		finalGridString += "4";
	} else {
		return "Could not convert to grid! " + row + "," + tile;
	}

	return finalGridString;
}

function isMoveStartValid(quadrant, moveStart, whoseTurn) {
	if (whoseTurn === "Black") {
		if (quadrant !== "botLeft" && quadrant !== "botRight") {
			return quadrant + " is not a " + whoseTurn + " shobu.";
		}

		var validMoveFormatResult = validMoveFormat(moveStart);
		if (typeof validMoveFormatResult === 'string') {
			return validMoveFormatResult;
		}

		var shobu = gameboard[quadrant];
		if (shobu[getRow(moveStart)][getColumn(moveStart)] !== BLACK_STONE) {
			return moveStart + " is not a " + whoseTurn + " stone";
		}
	} else {
		if (quadrant !== "topLeft" && quadrant !== "topRight") {
			return quadrant + " is not a " + whoseTurn + " shobu.";
		}

		var validMoveFormatResult = validMoveFormat(moveStart);
		if (typeof validMoveFormatResult === 'string') {
			return validMoveFormatResult;
		}

		var shobu = gameboard[quadrant];
		if (shobu[getRow(moveStart)][getColumn(moveStart)] !== WHITE_STONE) {
			return moveStart + " is not a " + whoseTurn + " stone";
		}
	}

	return true;
}

function isMoveEndValid(quadrant, moveStart, moveEnd, whoseTurn) {
	var validMoveFormatResult = validMoveFormat(moveEnd);
	if (typeof validMoveFormatResult === 'string') {
		return validMoveFormatResult;
	}

	var shobu = gameboard[quadrant];

	if (Math.abs(getRow(moveStart) - getRow(moveEnd)) > 2 || Math.abs(getColumn(moveStart) - getColumn(moveEnd)) > 2) {
		return "Distance between " + moveStart + " and " + moveEnd + " is greater than 2.";
	}

	if (Math.abs(getRow(moveStart) - getRow(moveEnd)) > 1 || Math.abs(getColumn(moveStart) - getColumn(moveEnd)) > 1) {
		if (Math.abs(getRow(moveStart) - getRow(moveEnd)) === 1 || Math.abs(getColumn(moveStart) - getColumn(moveEnd)) === 1) {
			return "You must move in a straight line or 45 degrees line, or whatever, you get it";
		}
	}

	if (shobu[getRow(moveEnd)][getColumn(moveEnd)] !== "-") {
		return moveEnd + " is not passive.";
	}
}

function validMoveFormat(move) {
	if (move.charAt(0) !== "A" && move.charAt(0) !== "B" && move.charAt(0) !== "C" && move.charAt(0) !== "D") {
		return move.charAt(0) + " is not a valid shobu row.";
	}

	if (move.charAt(1) !== "1" && move.charAt(1) !== "2" && move.charAt(1) !== "3" && move.charAt(1) !== "4") {
		return move.charAt(1) + " is not a valid shobu column.";
	} 
	return true;
}

function getRow(move) {
	if (move.charAt(0) === "A") {
		return 0;
	} else if (move.charAt(0) === "B") {
		return 1;
	} else if (move.charAt(0) === "C") {
		return 2;
	} else {
		return 3;
	}
}

function getColumn(move) {
	if (move.charAt(1) === "1") {
		return 0;
	} else if (move.charAt(1) === "2") {
		return 1;
	} else if (move.charAt(1) === "3") {
		return 2;
	} else {
		return 3;
	}
}

function isQuadrant(quadrant) {
	return QUADRANTS.includes(quadrant) ? true : "Quadrant is not valid.";
}

function drawGameboard(gameboard) {
	process.stdout.write(" | dark    light\n\n");
	drawShobuRow(gameboard.topLeft, gameboard.topRight);
	process.stdout.write("---1234----1234-\n");
	drawShobuRow(gameboard.botLeft, gameboard.botRight);
	process.stdout.write("\nO = black   X = white\n\n");
}

function drawShobuRow(leftShobu, rightShobu) {
	for(var i = 0; i < 4; i++){
		switch(i){
			case 0: {
				process.stdout.write("A");
				break;
			};
			case 1: {
				process.stdout.write("B");
				break;
			 };
			case 2: {
				process.stdout.write("C");
				break;
			};
			case 3: {
				process.stdout.write("D");
				break;
			};
		}
		process.stdout.write("| ");
		leftShobu[i].forEach((tile) => {
			process.stdout.write(tile);
		});
		process.stdout.write("    ");
		rightShobu[i].forEach((tile) => {
			process.stdout.write(tile);
		});
		process.stdout.write("\n");
	}
}

function scanForWin(shobu) {
	var blackCount = 0;
	var whiteCount = 0;
	for(var i = 0; i < 4; i++){
		shobu[i].forEach((tile) => {
			if (tile === WHITE_STONE) {
				whiteCount++;
			} else if (tile === BLACK_STONE) {
				blackCount++;
			}
		});
	}

	if (whiteCount === 0 || blackCount === 0) {
		return true;
	} else {
		return false;
	}
}

function fillGameboard(gameboard) {
	// Bottom left
	gameboard.botLeft[0][0] = WHITE_STONE;
	gameboard.botLeft[0][1] = WHITE_STONE;
	gameboard.botLeft[0][2] = WHITE_STONE;
	gameboard.botLeft[0][3] = WHITE_STONE;

	gameboard.botLeft[1][0] = "-";
	gameboard.botLeft[1][1] = "-";
	gameboard.botLeft[1][2] = "-";
	gameboard.botLeft[1][3] = "-";

	gameboard.botLeft[2][0] = "-";
	gameboard.botLeft[2][1] = "-";
	gameboard.botLeft[2][2] = "-";
	gameboard.botLeft[2][3] = "-";

	gameboard.botLeft[3][0] = BLACK_STONE;
	gameboard.botLeft[3][1] = BLACK_STONE;
	gameboard.botLeft[3][2] = BLACK_STONE;
	gameboard.botLeft[3][3] = BLACK_STONE;

	// Bottom right
	gameboard.botRight[0][0] = WHITE_STONE;
	gameboard.botRight[0][1] = WHITE_STONE;
	gameboard.botRight[0][2] = WHITE_STONE;
	gameboard.botRight[0][3] = WHITE_STONE;

	gameboard.botRight[1][0] = "-";
	gameboard.botRight[1][1] = "-";
	gameboard.botRight[1][2] = "-";
	gameboard.botRight[1][3] = "-";

	gameboard.botRight[2][0] = "-";
	gameboard.botRight[2][1] = "-";
	gameboard.botRight[2][2] = "-";
	gameboard.botRight[2][3] = "-";

	gameboard.botRight[3][0] = BLACK_STONE;
	gameboard.botRight[3][1] = BLACK_STONE;
	gameboard.botRight[3][2] = BLACK_STONE;
	gameboard.botRight[3][3] = BLACK_STONE;

	// Top left
	gameboard.topLeft[0][0] = WHITE_STONE;
	gameboard.topLeft[0][1] = WHITE_STONE;
	gameboard.topLeft[0][2] = WHITE_STONE;
	gameboard.topLeft[0][3] = WHITE_STONE;

	gameboard.topLeft[1][0] = "-";
	gameboard.topLeft[1][1] = "-";
	gameboard.topLeft[1][2] = "-";
	gameboard.topLeft[1][3] = "-";

	gameboard.topLeft[2][0] = "-";
	gameboard.topLeft[2][1] = "-";
	gameboard.topLeft[2][2] = "-";
	gameboard.topLeft[2][3] = "-";

	gameboard.topLeft[3][0] = BLACK_STONE;
	gameboard.topLeft[3][1] = BLACK_STONE;
	gameboard.topLeft[3][2] = BLACK_STONE;
	gameboard.topLeft[3][3] = BLACK_STONE;

	// Top right
	gameboard.topRight[0][0] = WHITE_STONE;
	gameboard.topRight[0][1] = WHITE_STONE;
	gameboard.topRight[0][2] = WHITE_STONE;
	gameboard.topRight[0][3] = WHITE_STONE;

	gameboard.topRight[1][0] = "-";
	gameboard.topRight[1][1] = "-";
	gameboard.topRight[1][2] = "-";
	gameboard.topRight[1][3] = "-";

	gameboard.topRight[2][0] = "-";
	gameboard.topRight[2][1] = "-";
	gameboard.topRight[2][2] = "-";
	gameboard.topRight[2][3] = "-";

	gameboard.topRight[3][0] = BLACK_STONE;
	gameboard.topRight[3][1] = BLACK_STONE;
	gameboard.topRight[3][2] = BLACK_STONE;
	gameboard.topRight[3][3] = BLACK_STONE;
}

function createArray(length) {
    var arr = new Array(length || 0),	
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = createArray.apply(this, args);
    }

    return arr;
}

class Opponent {
    constructor(){
        console.log('constructing opponent')
    }

    taunt(){
        console.log("Computer Player: You are going down, you don't stand a chance")
    }

    takeTurn(args){
		console.log("Computer Player is taking her turn....")

		var boardStateCopy = JSON.parse(JSON.stringify(gameboard));
		var turnOptions = getTurnOptions(boardStateCopy, "Black")
		if(turnOptions.length < 1){
			console.log("Never mind, Computer Player doesnt think it has a turn. It's your turn again")
			args.callBack();
		} else {
			var bestOption = { value: -1000, turn: turnOptions[0]}
			turnOptions.map(option => {
				optionValue = minimax(safeApplyTurn(boardStateCopy, option), 5, true)
				if(optionValue > bestOption.value){
					bestOption.value = optionValue;
					bestOption.turn = option;
				}
			})

			applyTurn(gameboard, bestOption);
			args.callBack();
		}
	}

	// This is basically the PseudoCode for minimax lifted directly from https://en.wikipedia.org/wiki/Minimax 
	// and then translated into JS.
	// The key/interesting part will be playing around with variations of the 'boardStateValue()' function.
	minimax(boardState, depth, maximizingPlayer){
		var boardStateCopy = JSON.parse(JSON.stringify(boardState));
		if(depth = 0 || isTerminalBoardState(boardStateCopy)){
			return boardStateValue(boardStateCopy)
		}
		if(maximizingPlayer){
			var value = -1000;
			var turnOptions = getTurnOptions(boardStateCopy, "Black")
			turnOptions.map(option => {
				value = max(value, minimax(safeApplyTurn(boardStateCopy, option), depth - 1, false))
			})
			return value
		} else {// minimizing player *)
			var value = 1000;
			var turnOptions = getTurnOptions(boardStateCopy, "White")
			turnOptions.map(option => {
				value = min(value, minimax(safeApplyTurn(boardStateCopy, option), depth - 1, true))
			})
			return value
		}
	}
}

// Should return whether either player won
//(or if both players cannot move, kinda tricky)
function isTerminalBoardState(){
	return true;
};

// Returns how good the board state is with 0 being neutral,
// a higher, positive number being better
// a lower, negative number being worse
//
// A couple potential heuristics:
//  number of pieces AI player has on board
//  negative of number of pieces human has on board
//  difference of AI pieces - Human pieces
//
// could experiment with weighting 3 stones/ 2 stones/ 1 stones differently 
// could experiment with weighting passive-side stones higher/lower
function boardStateValue(boardState){
	return 0;
}

// Should return an array of 'turn' objects
// turn object is
// { passiveMove: ... , aggressiveMove: ... }
function getTurnOptions(){
	return [];
}

//creates a copy of the board state so it isn't modifying instances of that board state elsewhere
function safeApplyTurn(boardState){
	return applyTurn(JSON.parse(JSON.stringify(boardState)));
}

// Takes a board state and a 'turn' object
// returns the boardState with that turn applied.
// Ideally could also support half-turns (just aggressive/passive moves)
function applyTurn(boardState, turn){
	return boardState
}