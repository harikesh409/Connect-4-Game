// constants
const WEB_WORKER_URL = 'scripts/worker.js';
const BLURBS = {
  'start': {
    header: 'Get Ready',
    blurb: 'Select your difficulty and start the game.'
  },
  'p1-turn': {
    header: 'Your Turn',
    blurb: 'Click on the board to drop your chip.'
  },
  'p2-turn': {
    header: 'Computer\'s Turn',
    blurb: 'The computer is trying to find the best way to make you lose.'
  },
  'p1-win': {
    header: 'You Win',
    blurb: 'You are a winner. Remember this moment. Carry it with you, forever.'
  },'p1-win-offline': {
    header: 'Player 1 Won',
    blurb: 'You are a winner. Remember this moment. Carry it with you, forever.'
  },
  'p2-win-offline': {
    header: 'Player 2 Won',
    blurb: 'You are a winner. Remember this moment. Carry it with you, forever.'
  },
  'p2-win': {
    header: 'Computer Wins',
    blurb: 'Try again when you\'re done wiping your tears of shame.'
  },
  'tie': {
    header: 'Tie',
    blurb: 'Everyone\'s a winner! Or loser. Depends on how you look at it.'
  },
  'main_title':{
    header:'Choose Game Mode',
    blurb:'Infos !!\' 2 players : in offline '
  },
  'main_title2':{
    header:'Infos',
    blurb:'2 players : in offline (Red Vs Green)'
  },
  'Vs Computer':{
    header:"Difficulty"
  },
  'Vs Human':{
    header:'Playing with Friends !!'
  }
};
const OUTLOOKS = {
  'win-imminent': 'Uh oh, computer is feeling saucy!',
  'loss-imminent': 'Computer is unsure. Now\'s your chance!'
};

// global variables
var worker;
var currentGameState;


// document ready
$(function() {
  setTitle('main_title')
  setBlurb('main_title2');
  $('#vs_c').click(()=>{
    setTitle('Vs Computer')
    $('#vs_h').hide()
    $('.start:first , .dif-options').css({
      'visibility':'visible',
      'display':'inherit'
    })
    $('#vs_c').hide()
    setBlurb('start');
    this.vs_='c'
  })
  $('#vs_h').click(()=>{
    setTitle('Vs Human')
    $('#vs_c').hide()
    $('#vs_h').hide()
    $('.start:last').css({
      'display':'inherit',
      'visibility':'visible'
    })
    this.vs_='h'
  })
  // $('.start button').on('click', startGame(vs_));
  // setBlurb('start');
  // setOutlook();
 $('.start:first').click(()=>{
   
    setBlurb('start');
    setOutlook();
    startGame(this.vs_)
 })
 $('.start:last').click(()=>{
  
  //  setBlurb('start');
   setOutlook();
   startGame(this.vs_)
})
  
  // create worker
  worker = new Worker(WEB_WORKER_URL);
  worker.addEventListener('message', function(e) {
    switch(e.data.messageType) {
      case 'reset-done':
        startHumanTurn();
        break;
      case 'human-move-done':
        endHumanTurn(e.data.coords, e.data.isWin, e.data.winningChips, e.data.isBoardFull,gamemode);
        break;
        //player 2 handlers
      case 'progress_player2':
          startplayer2turn();
          break;
      case 'player2-move-done':
          endplayer2turn(e.data.coords, e.data.isWin, e.data.winningChips, e.data.isBoardFull,
            e.data.isWinImminent, e.data.isLossImminent);
          break;
          //*********** 
      case 'progress':
        updateComputerTurn(e.data.col);
        break;
      case 'computer-move-done':
        endComputerTurn(e.data.coords, e.data.isWin, e.data.winningChips, e.data.isBoardFull,
          e.data.isWinImminent, e.data.isLossImminent);
        break;
    }
  }, false);
});

function setBlurb(key) {
  $('.info h2').text(BLURBS[key].header);
  $('.info .blurb').text(BLURBS[key].blurb);
}
function setTitle(key){
  $('.dif h2').text(BLURBS[key].header)
}
function setOutlook(key) {
  var $outlook = $('.info .outlook');
  if(key) {
    $outlook
      .text(OUTLOOKS[key])
      .show();
  } else {
    $outlook.hide();
  }
}
var gamemode;
function startGame(vs_) {
  $('.dif').addClass('freeze');
  $('.dif input').prop('disabled', true);
  $('.lit-cells, .chips').empty();
  switch(vs_){
    case 'h':
      gamemode = "h"
      worker.postMessage({
        messageType: 'reset',
        gamemode:'h'
      });
      break;
    case 'c':
      gamemode = "c"
      worker.postMessage({
        messageType: 'reset',
        gamemode:'c'
      });
      break;
      default:
        console.log('default op')
        break;
  }

}

function startHumanTurn() {
  setBlurb('p1-turn');
  $('.click-columns div').addClass('hover');
  
  // if mouse is already over a column, show cursor chip there
  var col = $('.click-columns div:hover').index();
  if(col !== -1) {
    createCursorChip(1, col);
  }
  
  $('.click-columns')
    .on('mouseenter', function() {
      var col = $('.click-columns div:hover').index();
      createCursorChip(1, col);
    })
    .on('mouseleave', function() {
      destroyCursorChip();
    });
  
  $('.click-columns div')
    .on('mouseenter', function() {
      var col = $(this).index();
      moveCursorChip(col);
    })
    .on('click', function() {
      $('.click-columns, .click-columns div').off();
      
      var col = $(this).index();
      worker.postMessage({
        messageType: 'human-move',
        col: col
      });
    });  
}

function endHumanTurn(coords, isWin, winningChips, isBoardFull,gamemode) {
  $('.click-columns div').removeClass('hover');
  
  if(!coords) {
    // column was full, human goes again
    
      startHumanTurn();  
      
  } else {
    dropCursorChip(coords.row, function() {
      if(isWin) {
        if(gamemode =="h"){
          endGame('p1-win-offline', winningChips);
        }else{
        endGame('p1-win', winningChips);
      }
      } else if(isBoardFull) {
        endGame('tie');
      } else {
        // pass turn to computer
        if(gamemode =='c'){ 
        startComputerTurn();
        }else {
          startplayer2turn();
        }
      }
    });
  }
}

function startComputerTurn() {
  setBlurb('p2-turn');
  
  // computer's cursor chip starts far left and moves right as it thinks
  createCursorChip(2, 0);
  
  var maxDepth = parseInt($('input[name=dif-options]:checked').val(), 10) + 1;
  worker.postMessage({
    messageType: 'computer-move',
    maxDepth: maxDepth
  });
}

function updateComputerTurn(col) {
  moveCursorChip(col);
}

function endComputerTurn(coords, isWin, winningChips, isBoardFull, isWinImminent, isLossImminent) {
  moveCursorChip(coords.col, function() {
    dropCursorChip(coords.row, function() {
      if (isWin) {
        endGame('p2-win', winningChips);
      } else if (isBoardFull) {
        endGame('tie');
      } else {
        if(isWinImminent) {
          setOutlook('win-imminent');
        } else if (isLossImminent) {
          setOutlook('loss-imminent');
        } else {
          setOutlook();
        }
        
        // pass turn to human
        startHumanTurn();
      }
    });
  });
}

function endGame(blurbKey, winningChips) {
  $('.dif').removeClass('freeze');
  $('.dif input').prop('disabled', false);
  setBlurb(blurbKey);
  setOutlook();
  
  if(winningChips) {
    // not a tie, highlight the chips in the winning run
    for(var i = 0; i < winningChips.length; i++) {
      createLitCell(winningChips[i].col, winningChips[i].row);
    }
  }
}

function createLitCell(col, row) {
  $('<div>')
  .css({
    'left': indexToPixels(col),
    'bottom': indexToPixels(row)
  })
  .appendTo('.lit-cells');
}

function createCursorChip(player, col) {
  var playerClass = 'p' + player;
  $('<div>', { 'class': 'cursor ' + playerClass })
    .css('left', indexToPixels(col))
    .appendTo('.chips');
  
  // also highlight column
  $('.lit-columns div').eq(col).addClass('lit');
}

function destroyCursorChip() {
  $('.chips .cursor').remove();
  $('.lit-columns .lit').removeClass('lit');
}

function moveCursorChip(col, callback) {
  $('.chips .cursor').css('left', indexToPixels(col));
  $('.lit-columns .lit').removeClass('lit');
  $('.lit-columns div').eq(col).addClass('lit');
  
  // callback is only used when the computer is about to drop a chip
  // give it a slight delay for visual interest
  setTimeout(callback, 300);
}

function dropCursorChip(row, callback) {
  // speed of animation depends on how far the chip has to drop
  var ms = (7 - row) * 40;
  var duration = (ms / 1000) + 's';
  
  $('.chips .cursor')
    .removeClass('cursor')
    .css({
      'bottom': indexToPixels(row),
      'transition-duration': duration,
      'animation-delay': duration
    })
    .addClass('dropped');
  
  $('.lit-columns .lit').removeClass('lit');
  setTimeout(callback, ms);
}

function indexToPixels(index) {
  return (index * 61 + 1) + 'px';
}

//player 2 handlers
function startplayer2turn() {
  setBlurb('p1-turn');
  $('.click-columns div').addClass('hover');
  
  // if mouse is already over a column, show cursor chip there
  var col = $('.click-columns div:hover').index();
  if(col !== -1) {
    createCursorChip(2, col);
  }
  
  $('.click-columns')
    .on('mouseenter', function() {
      var col = $('.click-columns div:hover').index();
      createCursorChip(2, col);
    })
    .on('mouseleave', function() {
      destroyCursorChip();
    });
  
  $('.click-columns div')
    .on('mouseenter', function() {
      var col = $(this).index();
      moveCursorChip(col);
    })
    .on('click', function() {
      $('.click-columns, .click-columns div').off();
      
      var col = $(this).index();
      worker.postMessage({
                        //computer-move
        messageType: 'player2-move',
        col: col
      });
    });  
}

function endplayer2turn(coords, isWin, winningChips, isBoardFull) {
  $('.click-columns div').removeClass('hover');
  if(!coords) {
    // column was full, human goes again
    startHumanTurn();    
  } else {
    dropCursorChip(coords.row, function() {
      if(isWin) {
        
        endGame('p2-win-offline', winningChips);
      } else if(isBoardFull) {
        endGame('tie');
      } else {
        // pass turn to computer
        startHumanTurn();
      }
    });
  }
}