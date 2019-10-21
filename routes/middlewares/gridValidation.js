function validateGrid(req, res, next) {
  try {
    let {
      values, // [ ]
      cellValues , // [ [] ]
      timeout,
    } = req.body;
    
    if (timeout) {
      timeout *= 10**3;
    } else {
      timeout = 10 * 10**3;
    }

    if (!values) {
      return res.status(400).json({
        error: {
          message: 'Values array is required',
        }
      })
    }

    const size = values.length;
    if (size > 9) {
      return res.status(400).json({
        error: {
          message: 'Solution for grid larger than 9x9 is currently not supported!',
        }
      })
    } 
    
    const valueToCellsMap = Object.fromEntries(values.map(value => [value, []]));

    if (!cellValues) {
      cellValues = new Array(size * size).fill('');
    } else {
      if (cellValues.length !== size) {
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
    }

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

    req.body.cells = cells;
    req.body.numFilledCells = numFilledCells;
    req.body.valueToCellsMap = valueToCellsMap;
    req.body.timeout = timeout;

    next();

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: {
        message: 'Something went wrong, try again later...'
      }
    })
  }
}

module.exports = validateGrid;

function getSubgridNumber(row, col, gridSize) {
  const subgridSize = Math.sqrt(gridSize);
  const [subgridRow, subgridCol] = [Math.floor(row/subgridSize), Math.floor(col/subgridSize)];
  return subgridRow + subgridCol * subgridSize;
}