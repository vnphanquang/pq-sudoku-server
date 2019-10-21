const express = require('express');
const router = express.Router();
const gridValidation = require('../middlewares/gridValidation');

router.post('/sudoku/classic', gridValidation, async (req, res) => {
  try {
    const { 
      algorithm = 'backtracking', // backtracking
      values, 
      cells,
      valueToCellsMap,
      numFilledCells,
      timeout,
    } = req.body;

    const size = values.length;

    if (numFilledCells === size * size) {
      return res.status(209).json({
        message: 'Grid is already solved'
      });
    }

    if (size === 4 && numFilledCells < 4) {
      return res.status(400).json({
        error: {
          message: 'At least 4 pre-filled cells needed to have a unique solution',
        }
      })
    } else if (size === 9 && numFilledCells < 17) {
      return res.status(400).json({
        error: {
          message: 'At least 17 pre-filled cells needed to have a unique solution',
        }
      })
    }

    const solver = algorithmVariants[algorithm];
    if (!solver) {
      return res.status(400).json({
        error: {
          message: 'Algorithm specified is not valid/available.'
        }
      })
    }
  
    const { isTimeout, unsolvable } = await solver(values, cells, valueToCellsMap, timeout);

    if (isTimeout) {
      return res.status(408).json({
        error: {
          message: 'Timeout! Try again at another time.'
        }
      });
    } else if (unsolvable) {
      return res.status(400).json({
        error: {
          message: 'No valid solution found'
        }
      });
    }
    
    const solution = [];
    for (let row = 0; row < size; row++) {
      solution.push([]);
      for (let col = 0; col < size; col++) {
        solution[row].push(cells[row * size + col].value);
      }
    }

    return res.status(200).json({ 
      solution
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: {
        message: 'Something went wrong, try again later...'
      }
    })
  }
})

module.exports = router;

const algorithmVariants = {
  backtracking: backtrack,
}

// Function is not pure and will mutate cells & valueToCellsMap
async function backtrack(values, cells, valueToCellsMap, timeout) {
  const startTime = Date.now();
  let currentIndex = 0;
  let currentCell, currentValue;
  let conflicting = false;
  let backing = false;
  let bitMask;
  let unsolvable = false;
  while (currentIndex < cells.length) {
    currentCell = cells[currentIndex];
    if (!currentCell.locked) {
      if (backing) {
        valueToCellsMap[currentCell.value].pop();
        currentCell.currentValueIndex += 1;
      }
      while(currentCell.currentValueIndex < values.length) {
        if (Date.now() - startTime > timeout) {
          return {
            isTimeout: true
          }
        }
        conflicting = false;
        currentValue = values[currentCell.currentValueIndex];
        for (const cell of valueToCellsMap[currentValue]) {
          bitMask = (
            0 | 
            (cell.row === currentCell.row) | 
            ((cell.col === currentCell.col) << 1) | 
            ((cell.subgrid === currentCell.subgrid) << 2)
          );
          if (bitMask && bitMask !== 7) {
            conflicting = true;
            break;
          }
        }
        if (!conflicting) {
          break; 
        } else {
          currentCell.currentValueIndex += 1;
        }
      }
      if (!conflicting) {
        currentCell.value = currentValue;
        valueToCellsMap[currentValue].push(currentCell);
        currentIndex++;
        backing = false;
      } else {
        currentCell.currentValueIndex = 0;
        currentIndex--;
        backing = true;
      }
    } else {
      currentIndex += backing ? -1 : 1;
    }
    if (currentIndex === -1) {
      unsolvable = true;
      break;
    }

  }

  return {
    isTimeout,
    unsolvable,
  }
}

