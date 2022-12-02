export default class WorkLog {
  constructor(main, changedHandler) {
    this.main = main;
    this.gridMain = main;
    this.current = null;
    this.currentGrid = null;
    this.changedHandler = changedHandler;
    this.empty = true;
    this.clean = true;
    this.ctx = main.ctx;
    this.gridObject = null;
    this.originalImage = main.ctx;
    // make a global var for grid with image set it when loaded in the lib
  }

  getWorklogAsString(params) {
    const saveState = Object.assign({}, this.current);
    let curCleared = this.clearedCount;

    if (params.limit !== undefined) {
      const limit = params.limit;
      curCleared = 0;
      let active = saveState;
      let i;
      for (i = 0; i < limit; i += 1) {
        active.prevCount = limit - i;
        if (i < limit - 1 && active.prev) {
          active = active.prev;
        }
      }
      active.prev = null;
    }
    return JSON.stringify({
      clearedCount: curCleared,
      current: saveState,
    });
  }

  loadWorklogFromString(str) {
    const obj = JSON.parse(str);
    if (obj) {
      console.log(obj);
      this.clearedCount = obj.clearedCount;
      this.current = obj.current;
      this.applyState(this.current);
    }
    return this.main;
  }

  changed(initial) {
    console.log(initial);
    if (
      this.current.prevCount - this.clearedCount >
      this.main.params.worklogLimit
    ) {
      this.first = this.first.next;
      console.log(this.first);
      this.first.prev = null;
      this.clearedCount += 1;
    }
    this.changedHandler({
      first: this.current.prev === null,
      last: this.current.next === null,
      initial,
    });
    console.log(this.changedHandler);

    this.empty = initial;
    this.clean = false;
  }

  captureState(initial) {
    let activeToolName = this.main.activeTool
      ? this.main.activeTool.name
      : null;
    if (this.main.params.NON_SELECTABLE_TOOLS.includes(activeToolName)) {
      activeToolName = this.main.defaultTool.name;
      console.log(activeToolName);
    }

    const state = {
      sizew: this.main.size.w,
      sizeh: this.main.size.h,
      activeToolName,
      data: this.ctx.getImageData(0, 0, this.main.size.w, this.main.size.h),
    };
    console.log(this.gridObject);
    // take the curr state remove the global grid state from it and call captureState back
    //and update the global var to the curr state + grid
    if (this.current === null) {
      state.prev = null;
      state.prevCount = 0;
      this.first = state;
      this.clearedCount = 0;
    } else {
      console.log(this.current);
      state.prev = this.current;
      state.prevCount = this.current.prevCount + 1;
      this.current.next = state;
    }
    state.next = null;
    this.current = state;
    this.changed(initial);
  }

  captureGrid(initial) {
    let activeToolName = "grid";

    const gridState = {
      sizew: this.gridMain.size.w,
      sizeh: this.gridMain.size.h,
      activeToolName,
      data: this.ctx.getImageData(
        0,
        0,
        this.gridMain.size.w,
        this.gridMain.size.h
      ),
    };

    if (this.currentGrid === null) {
      gridState.prevGrid = null;
      gridState.prevGridCount = 0;
      this.firstGrid = gridState;
      this.clearedCount = 0;
    } else {
      console.log(this.currentGrid);
      gridState.prevGrid = this.currentGrid;
      gridState.prevGridCount = this.currentGrid.prevCount + 1;
      this.currentGrid.next = gridState;
    }
    console.log(gridState);
    gridState.next = null;
    this.currentGrid = gridState;
    this.changed(initial);
  }

  reCaptureState() {
    if (this.current.prev !== null) {
      this.current = this.current.prev;
    }
    this.captureState();
  }

  applyState(state) {
    this.main.resize(state.sizew, state.sizeh);
    this.main.ctx.putImageData(state.data, 0, 0);
    this.main.adjustSizeFull();
    this.main.select.hide();
  }
  applyGridState(state) {
    this.gridMain.resize(state.sizew, state.sizeh);
    this.gridMain.ctx.putImageData(state.data, 0, 0);
    this.gridMain.adjustSizeFull();
    this.gridMain.select.hide();
    console.log(this.gridMain);
  }
  undoState() {
    if (this.current.prev !== null) {
      let currentToolName = this.current.activeToolName;
      this.current = this.current.prev;
      // make current prev
      //
      this.applyGridState(this.currentGrid);
      this.applyState(this.current);
      this.changed(false);
      if (currentToolName) {
        this.main.closeActiveTool(true);
        this.main.setActiveTool(this.main.toolByName[currentToolName]);
      } else {
        this.main.closeActiveTool();
      }

      if (this.main.params.onUndo) {
        this.main.params.onUndo(this.current);
      }
    }
    console.log(this.currentGrid);
  }

  redoState() {
    if (this.current.next !== null) {
      this.current = this.current.next;
      this.applyState(this.current);
      this.changed(false);

      const nextToolName = this.current.activeToolName;

      if (nextToolName) {
        this.main.closeActiveTool(true);
        this.main.setActiveTool(this.main.toolByName[nextToolName]);
      } else {
        this.main.closeActiveTool();
      }

      if (this.main.params.onRedo) {
        this.main.params.onRedo(this.current);
      }
    }
  }
}
