const express = require('express');;
const router = express.Router();

router.post('/sudoku/classic', async (req, res) => {
  try {
    const { 
      algorithm, // backtracking
      values, // [ ]
      cellValues, // [ [] ]
    } = req.body;
    
    const size = values.length;

    if (size > 9) {
      return res.status(400).json({
        error: {
          message: 'Solution for grid larger than 9x9 is currently not supported!',
        }
      })
    } else if (cellValues.length !== size) {
      return res.status(400).json({
        error: {
          message: 'Cell array length does not match Values array length',
        }
      })
    } else if (!cellValues.every(row => row.length === size)) {
      return res.status(400).json({
        error: {
          message: 'Rows within Cell array is not consistent in length',
        }
      })
    }

    const valueToCellsMap = Object.fromEntries(values.map(value => [value, []]));

    const cells = [];
    const conflicts = [];
    let numFilledCells = 0;
    let cellsOfSameValue;
    let cell, value, subgrid;
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        subgrid = getSubgridNumber(row, col, size);
        value = cellValues[row][col];
        if (value) {
          numFilledCells++;
          cellsOfSameValue = valueToCellsMap[value];
          for (const other of cellsOfSameValue) {
            if (
              row === other.row ||
              col === other.col ||
              subgrid === other.subgrid
            ) {
              conflicts.push([
                {row: cell.row, col: cell.col},
                {row: other.row, col: other.col}
              ])
            }
          }
          locked = true;
          cell = {
            value, row, col, subgrid, locked,
          }
          cellsOfSameValue.push(cell);
        } else {
          locked = false;
          cell = {
            value: '', 
            row, col, subgrid, locked,
            currentValueIndex: 0
          }
        }
        cells.push(cell);
      }
    }

    if (conflicts.length > 0) {
      return res.status(400).json({
        error: {
          message: 'Conflicts found within grid',
          conflicts
        }
      });
    }

    if (numFilledCells === size * size) {
      return res.status(209).json({
        message: 'something'
      });
    }

    if (size === 4 && numFilledCells < 4) {
      return res.status(400).json({
        error: {
          message: 'At least 4 pre-filled cells needed',
        }
      })
    } else if (size === 9 && numFilledCells < 17) {
      return res.status(400).json({
        error: {
          message: 'At least 17 pre-filled cells needed',
        }
      })
    }

    let timeout = req.body.timeout;
    if (timeout) {
      timeout *= 10**3;
    } else {
      timeout = 5 * 10**3;
    }

    let filledCells;
    let solution;
    switch(algorithm) {
      case 'backtracking':
        filledCells = await backtracking(values, cells, valueToCellsMap, timeout);
        solution = [];
        for (let row = 0; row < size; row++) {
          solution.push([]);
          for (let col = 0; col < size; col++) {
            solution[row].push(filledCells[row * size + col].value);
          }
        }
        break;
      default:
        break;
    }

    if (!solution) {
      return res.status(408).json({
        error: {
          message: 'Reached specified timeout'
        }
      })
    }
    
    return res.status(200).json({ 
      error: null,
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

async function backtracking(values, cells, valueToCellsMap, timeout) {
  const startTime = Date.now();
  let currentIndex = 0;
  let currentCell, currentValue;
  let conflicting = false;
  let backing = false;
  let bitMask;
  let isTimeout = false;
  while (currentIndex < cells.length) {
    if (Date.now() - startTime > timeout) {
      isTimeout = true;
      break;
    }
    currentCell = cells[currentIndex];
    if (!currentCell.locked) {
      if (backing) {
        valueToCellsMap[currentCell.value].pop();
        currentCell.currentValueIndex += 1;
      }
      while(currentCell.currentValueIndex < values.length) {
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
        currentCell.value = '';
        currentCell.currentValueIndex = 0;
        currentIndex--;
        backing = true;
      }
    } else {
      currentIndex += backing ? -1 : 1;
    }
  }
  if (isTimeout) {
    return false;
  } else {
    return cells;
  }
}

function getSubgridNumber(row, col, gridSize) {
  const subgridSize = Math.sqrt(gridSize);
  const [subgridRow, subgridCol] = [Math.floor(row/subgridSize), Math.floor(col/subgridSize)];
  return subgridRow + subgridCol * subgridSize;
}