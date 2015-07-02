// board size, in pixels width and height
var sz = 400;
// row, col => square name
function sq(r, c) {
    c = 'abcdefgh'[c];
    r = 8 - r;
    return (c && r > 0 && r <= 8) ? (c + r) : '';
}
// square name => row, col
function coord(s) {
    return { col: 'abcdefgh'.indexOf(s[0]), row: 8 - (+s[1]) };
}
// piece => its color
function clr(p) {
    return p ? ((p == p.toUpperCase()) ? 'w' : 'b') : '';
}
// DOM element
var board = $('<div>').css({
    position: 'fixed', width: sz + 'px', height: sz + 'px',
    bottom: '10px', right: '10px', zIndex: '999'
}).appendTo(document.body);
// chessboard data
var data = {};
// transfer data to board
function updateBoard() {
    $('>div', board).css('background-image', 'none');
    for (s in data) {
        var piece = data[s].toUpperCase(),
            color = clr(data[s]),
            url = 'url("http://lichess1.org/assets/piece-src/cburnett/' +
                color + piece + '.svg")';
        $('#' + s, board).css('background-image', url);
    }
}
// apply a move to data
function doMove(move, color, returnFixedMove) {
    // TODO castling, make promotions actually do something, error handling
    move = move.match(/^([RNBQK]?)([a-h]?)([1-8]?)x?([a-h])([1-8])((?:=[RNBQK])?)\+?#?$/);
    var piece = move[1] || 'P', fromRow = move[2], fromCol = move[3],
        toRow = move[4], toCol = move[5], promotion = move[6];
    var to = toRow + toCol;
    var from = Object.keys(data).filter(function(s) {
        return color == clr(data[s]) &&
               data[s].toUpperCase() == piece &&
               (!fromRow || (s[0] == fromRow)) &&
               (!fromCol || (s[1] == fromCol)) &&
               possibleMoves(s).indexOf(to) !== -1;
    })[0];

    // warning, super ugly line:
    // TODO return + or # when applicable
    if (returnFixedMove) {
        var fixedMove = piece.replace('P', '') +
            (((piece == 'P' && data[to]) || Object.keys(data).filter(function(s) {
                return color == clr(data[s]) &&
                       data[s].toUpperCase() == piece &&
                       //(!fromRow || (s[0] == fromRow)) &&
                       //(!fromCol || (s[1] == fromCol)) &&
                       possibleMoves(s).indexOf(to) !== -1;
            }).length > 1) ? fromRow : '') +
            (Object.keys(data).filter(function(s) {
                return color == clr(data[s]) &&
                       data[s].toUpperCase() == piece &&
                       (!fromRow || (s[0] == fromRow)) &&
                       //(!fromCol || (s[1] == fromCol)) &&
                       possibleMoves(s).indexOf(to) !== -1;
            }).length > 1 ? fromCol : '') +
            (data[to] ? 'x' : '') + to + promotion
    }

    data[to] = data[from];
    delete data[from];
    updateBoard();

    if (returnFixedMove) return fixedMove;
}
// list all possible squares that a piece could move to
function possibleMoves(s) {
    // TODO castling, en passant, check
    var moves = [], c = coord(s);
    var addMovesWithDeltas = function(deltas, maxlen) {
            maxlen = maxlen || 7;
            deltas.forEach(function(delta) {
                for (var i = 1; i <= maxlen; ++i) {
                    var toSquare = sq(c.row + delta[0]*i, c.col + delta[1]*i);
                    moves.push(toSquare);
                    if (data[toSquare]) break;
                }
            });
        },
        dDiagonal = [[1, 1], [-1, -1], [1, -1], [-1, 1]],
        dStraight = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    switch (data[s].toUpperCase()) {
    case 'R':
        addMovesWithDeltas(dStraight);
        break;
    case 'N':
        [[2, 1], [2, -1], [-2, 1], [-2, -1],
            [1, 2], [-1, 2], [1, -2], [-1, -2]].forEach(function(delta) {
            moves.push(sq(c.row + delta[0], c.col + delta[1]));
        });
        break;
    case 'B':
        addMovesWithDeltas(dDiagonal);
        break;
    case 'Q':
        addMovesWithDeltas(dDiagonal);
        addMovesWithDeltas(dStraight);
        break;
    case 'K':
        addMovesWithDeltas(dDiagonal, 1);
        addMovesWithDeltas(dStraight, 1);
        break;
    case 'P':
        // multiplier for vertical movement
        var ml = (clr(data[s]) == 'w') ? -1 : 1;
        var toSquare;
        // standard move
        if (!data[toSquare = sq(c.row + 1*ml, c.col)]) moves.push(toSquare);
        // capturing
        if (data[toSquare = sq(c.row + 1*ml, c.col+1)]) moves.push(toSquare);
        if (data[toSquare = sq(c.row + 1*ml, c.col-1)]) moves.push(toSquare);
        // double move (from initial position)
        if (c.row == 6 && ml == -1 && !data[sq(5, c.col)])
            moves.push(sq(4, c.col));
        if (c.row == 1 && ml == 1 && !data[sq(2, c.col)])
            moves.push(sq(3, c.col));
        break;
    }
    // filter out moves that try to capture own piece or are off the board
    moves = moves.filter(function(m) {
        return m && (clr(data[s]) != clr(data[m]));
    });
    return moves;
}

// add squares, initialize data at the same time
var firstClick, fcMoves;
for (var row = 0; row < 8; ++row) {
    for (var col = 0; col < 8; ++col) {
        var s = sq(row, col);
        // the square on the chessboard, in the DOM
        board.append($('<div>').css({
            backgroundColor: ((row + col) % 2) == 0 ? '#FFF' : '#666',
            backgroundSize: 'cover',
            width: (sz / 8) + 'px', height: (sz / 8) + 'px', float: 'left',
            boxSizing: 'border-box'
        }).attr('id', s).click(function() {
            if (!myTurn) return;
            if (firstClick) {
                if (firstClick != this.id && fcMoves.indexOf(this.id) !== -1) {
                    makeMyMove(firstClick, this.id);
                }
                $('>div', board).css('border', '');
                firstClick = undefined;
            } else {
                if (clr(data[this.id]) == myColor) {
                    firstClick = this.id;
                    $(this).css('border', '5px solid red');
                    fcMoves = possibleMoves(firstClick);
                    fcMoves.forEach(function(m) {
                        $('#' + m).css('border', '5px solid green');
                    });
                }
            }
        }));
        // initialize board pieces
        switch (row) {
            case 0: data[s] = 'rnbqkbnr'[col]; break;
            case 1: data[s] = 'p'; break;
            case 6: data[s] = 'P'; break;
            case 7: data[s] = 'RNBQKBNR'[col]; break;
        }
    }
}
updateBoard();

// get list of moves from PGN string
function getMoves(s) {
    var words = s.split(' '), moveList = [];
    for (var i = 1; i < words.length; i += 3) {
        moveList.push(words[i]);
        if (words[i+1]) moveList.push(words[i+1]);
    }
    return moveList;
}
// find the current game
var myColor = 'w', myName = $('#active-user img').attr('alt').replace(/ /g, ''), myTurn = true;
var msg = $($('div:has(>.mention)').get().reverse()).filter(function() {
        return this.lastChild.textContent.indexOf(' 1. ') === 0;
    }).eq(0),
    moveList = getMoves(msg[0].lastChild.textContent.trim()),
    myOpponent = msg.closest('.user-container').find('.username:first').text().replace(/ /g, '');
for (var i = 0; i < moveList.length; i += 2) {
    var whiteMove = moveList[i], blackMove = moveList[i+1];
    doMove(whiteMove, 'w');
    if (blackMove) doMove(blackMove, 'b');
    else myColor = 'b';
}
// check if it's not my turn
var msg2 = msg.closest('.user-container').nextAll('.mine').find('.content').filter(function() {
    return this.textContent.indexOf('@' + myOpponent + ' 1. ') === 0;
}).eq(0);
if (msg2.length !== 0) {
    // TODO fix ugly code repetition (see a few lines down)
    var newMoves = getMoves(msg2.text().slice(myOpponent.length + 2))
        .slice(moveList.length);
    if (newMoves) {
        myTurn = false;
        var color = (moveList.length % 2 == 0) ? 'w' : 'b';
        for (var i = 0; i < newMoves.length; ++i) {
            doMove(newMoves[i], color);
            moveList.push(newMoves[i]);
            color = (color == 'w') ? 'b' : 'w';
        }
    }
}

// logic for sending a move
function makeMyMove(fromSquare, toSquare) {
    myTurn = false;
    var move = (data[fromSquare].toUpperCase().replace('P', '')) +
        fromSquare + toSquare;
    move = doMove(move, myColor, true);
    moveList.push(move);
    var msgText = [];
    msgText.push('@' + myOpponent);
    for (var i = 0; i < moveList.length; i += 2) {
        msgText.push((i/2 + 1) + '.');
        msgText.push(moveList[i]);
        if (moveList[i+1]) msgText.push(moveList[i+1]);
    }
    msgText = msgText.join(' ');
    $.post('http://' + location.host + '/chats/' + CHAT.CURRENT_ROOM_ID +
            '/messages/new', { fkey: fkey().fkey, text: msgText });
}

var sock = getSock();
sock.onmessage = function(e) {
    var wd = JSON.parse(e.data)['r' + CHAT.CURRENT_ROOM_ID];
    wd = (wd || {}).e;
    (wd || []).forEach(function(x) {
        if (x.content && x.content.indexOf('@' + myName + ' 1. ') === 0 &&
            x.user_name == myOpponent) {
            var newMoves = getMoves(x.content.slice(myName.length + 2))
                .slice(moveList.length);
            if (newMoves) {
                myTurn = true;
                var color = (moveList.length % 2 == 0) ? 'w' : 'b';
                for (var i = 0; i < newMoves.length; ++i) {
                    doMove(newMoves[i], color);
                    moveList.push(newMoves[i]);
                    color = (color == 'w') ? 'b' : 'w';
                }
            }
        }
    });
};

// ugliness \o/
function getSock() { return new WebSocket(JSON.parse($.ajax({type: 'POST', url: 'http://' + location.host + '/ws-auth', data: {roomid: CHAT.CURRENT_ROOM_ID, fkey: fkey().fkey}, async: false}).responseText)['url'] + '?l=' + JSON.parse($.ajax({type: 'POST', url: 'http://' + location.host + '/chats/' + CHAT.CURRENT_ROOM_ID + '/events', data: {fkey: fkey().fkey}, async: false}).responseText)['time']); }
