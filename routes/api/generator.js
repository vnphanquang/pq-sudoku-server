const express = require('express');
const router = express.Router();
const gridValidation = require('../middlewares/gridValidation');

router.post('/sudoku/classic', gridValidation, async (req, res) => {
  try {
    let {
      values,
      cells,
      valueToCellsMap,
      numFilledCells,
      timeout,
      count = 40
    } = req.body;

    const size = values.length;

    if (size === 4 && count < 4) {
      return res.status(400).json({
        error: {
          message: 'At least 4 pre-filled cells needed to have a unique solution',
        }
      });
    } else if (size === 9 && count < 17) {
      return res.status(400).json({
        error: {
          message: 'At least 17 pre-filled cells needed to have a unique solution',
        }
      });
    }

    if (numFilledCells === count) {
      return res.status(400).json({
        error: {
          message: 'Grid is already generated'
        }
      });
    }

    if (numFilledCells < size * size) {
      await randomFillGrid(values, cells, valueToCellsMap);
    }

    let removalCount = size * size - count;
    const removedCells = [];
    const nonRemovableCells = [];
    let valueToCellsMapCopy, cellsCopy, cellCopy, 
    row, col, cell, targetCell, potential, 
    currentIndex, currentCell, currentValue, 
    solvable, conflicting, backing, bitMask;

    // remove first cell value
    do {
      row = Math.floor(Math.random() * size);
      col = Math.floor(Math.random() * size);
      targetCell = cells[row * size + col];
    } while (targetCell.locked);
    valueToCellsMap[targetCell.value] = valueToCellsMap[targetCell.value]
      .filter(cell =>
        cell.row !== targetCell.row &&
        cell.col !== targetCell.col
      )
    removedCells.push({ 
      value: targetCell.value,
      row: targetCell.row, 
      col: targetCell.col,
    });
    targetCell.value = '';
    removalCount--;

  //=========================================
    let isTimeout = false;
    const startTime = Date.now();
    while (removalCount > 0) {
      // console.log(removalCount);
      // find a target cell to check for removal
      do {
        row = Math.floor(Math.random() * size);
        col = Math.floor(Math.random() * size);
        targetCell = cells[row * size + col];
        potential = 
          !targetCell.value && 
          !targetCell.locked &&
          nonRemovableCells.every(cell => cell.row !== row && cell.col !== col);
      } while (potential);


      removedCells.push({ 
        value: targetCell.value,
        row: targetCell.row, 
        col: targetCell.col,
      });
      currentIndex = removedCells.length - 1;

      // make copy of current grid
      valueToCellsMapCopy = Object.fromEntries(values.map(value => [value, []]));
      cellsCopy = [];
      for (cell of cells) {
        cellCopy = {
          value: cell.value,
          row: cell.row,
          col: cell.col,
          subgrid: cell.subgrid,
          currentValueIndex: 0,
          values: values
        }
        if (row === cellCopy.row && col === cellCopy.col) {
          // Filter out current value of target cell
          targetCell = cellCopy;
          targetCell.values = [...values.filter(value => value !== targetCell.value)];
          targetCell.value = ''
        } else if (cellCopy.value) {
          valueToCellsMapCopy[cellCopy.value].push(cellCopy);
        }
        cellsCopy.push(cellCopy);
      }

      solvable = false;
      conflicting = false;
      backing = false;

      while (true) {
        ({ row, col } = removedCells[currentIndex]);
        currentCell = cellsCopy[row * size + col];

        if (backing) {
          valueToCellsMapCopy[currentCell.value].pop();
          currentCell.currentValueIndex += 1;
        }

        while(currentCell.currentValueIndex < currentCell.values.length) {
          if (Date.now() - startTime > timeout) {
            return res.status(408).json({
              error: {
                message: 'Timeout! Try again at another time.'
              }
            });
          }
          conflicting = false;
          currentValue = currentCell.values[currentCell.currentValueIndex];
          for (cell of valueToCellsMapCopy[currentValue]) {
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
          valueToCellsMapCopy[currentValue].push(currentCell);
          currentIndex--;
          if (currentIndex === - 1) {
            solvable = true;
            break;
          } else {
            backing = false;
          }
        } else {
          currentIndex++;
          if (currentIndex === removedCells.length) {
            solvable = false;
            break;
          } else {
            currentCell.currentValueIndex = 0;
            backing = true;
          }
        }

      }

      if (!solvable) {
        ({row, col} = targetCell);
        targetCell = cells[row * size + col];
        valueToCellsMap[targetCell.value] = valueToCellsMap[targetCell.value]
          .filter(cell =>
            cell.row !== targetCell.row &&
            cell.col !== targetCell.col
          )
        targetCell.value = '';
        removalCount--;
      } else {
        removedCells.pop();
        nonRemovableCells.push(targetCell);
      }

    }

    // console.log('done')
    //=========================================

    const solution = [];
    for (let row = 0; row < size; row++) {
      solution.push([]);
      for (let col = 0; col < size; col++) {
        solution[row].push(cells[row * size + col].value);
      }
    }

    return res.status(200).json({
      clues: solution,
      hints: removedCells
    })


  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: {
        message: 'Something went wrong, try again later...'
      }
    })
  }
})

async function randomFillGrid(values, cells, valueToCellsMap) {
  let currentIndex = 0;
  let currentCell, currentValue;
  let bitMask;
  let conflicting = false;
  let backing = false;
  while (currentIndex < cells.length) {
    currentCell = cells[currentIndex];
    if (!currentCell.locked) {
      if (backing) {
        valueToCellsMap[currentCell.value].pop();
        currentCell.currentValueIndex += 1;
      } else if (!currentCell.values) {
        currentCell.values = shuffleArray(values, true);
      }
      while (currentCell.currentValueIndex < values.length) {
        conflicting = false;
        currentValue = currentCell.values[currentCell.currentValueIndex];
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
  return {
    cells,
    valueToCellsMap
  };
}

function shuffleArray(array, clone) {
  let copy = array;
  if (clone) {
    copy = [...array];
  }
  let randomIndex, temp;
  for (let currentIndex = copy.length - 1; currentIndex > 0; currentIndex--) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    temp = copy[currentIndex];
    copy[currentIndex] = copy[randomIndex];
    copy[randomIndex] = temp; 
  }
  return copy;
}

module.exports = router;