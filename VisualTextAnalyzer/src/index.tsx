import React from 'react';
import ReactDOM from 'react-dom';
import {select} from 'd3-selection';
import 'regenerator-runtime/runtime';
import {WordEntityBarCharts} from './WordEntityBarCharts';
import {DataSample} from './types';

export function renderProfilerViewBundle(divName: Element, data: DataSample) {
  ReactDOM.render(<WordEntityBarCharts hit={data} />, select(divName).node());
}
