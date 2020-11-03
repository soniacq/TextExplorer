import * as React from 'react';
import {Vega} from 'react-vega';
import {Spec as VgSpec} from 'vega';
// import vegaEmbed, { EmbedOptions, VisualizationSpec } from 'vega-embed';
import * as vegaLiteImport from 'vega-lite';
import {TopLevelSpec as VlSpec, compile} from 'vega-lite';
import './WordEntityBarCharts.css';

import ReactMarkdown from 'react-markdown';
import {DataSample, RequestResult} from './types';
export const vegaLite = vegaLiteImport;
import CommAPI from './CommAPI';

enum SortedByOptions {
  BYBOTH = 'Both categories',
  BYDIFFERENCE = 'Difference',
  BYPOSITIVE = 'Positive category',
  BYNEGATIVE = 'Negative category',
}

enum Yaxis {
  BYBOTH = 'Top words',
  BYDIFFERENCE = 'Top words based on the differences',
  BYPOSITIVE = 'Top words in positive category',
  BYNEGATIVE = 'Top words in negative category',
}

enum SelectedColumn {
  FREQUENCY = 'Frequency',
  NORMALIZED_FREQUENCY = 'Normalized Frequency',
}

enum SelectedColumnName {
  FREQUENCY = 'frequency',
  NORMALIZED_FREQUENCY = 'normalized_frequency',
}

const addSignalListener = {
  name: 'tooltip',
  value: {},
  on: [{events: '*:mousedown', update: 'datum'}],
};

interface WordEntityBarChartsProps {
  hit: DataSample;
}

interface WordEntityBarChartsState {
  processedData: DataSample;
  info: string;
  vegaSpec: VgSpec;
  vegaEntitySpec: VgSpec;
  vegaliteSpec: string;
  vegaliteEntitySpec: string;
  sortedFieldBy: string;
  selectedColumn: string;
  selectedColumnName: string;
  selectedYaxis: string;
  sampleText: string;
}

class WordEntityBarCharts extends React.PureComponent<
  WordEntityBarChartsProps,
  WordEntityBarChartsState
> {
  handlers: {
    tooltip: (...args: unknown[]) => void;
  };
  commGetYAxis: CommAPI;
  commGetTextSample: CommAPI;
  constructor(props: WordEntityBarChartsProps) {
    super(props);
    this.state = {
      processedData: this.props.hit,
      info: '{}',
      vegaSpec: {},
      vegaEntitySpec: {},
      vegaliteSpec: '',
      vegaliteEntitySpec: '',
      sortedFieldBy: SortedByOptions.BYBOTH,
      selectedColumn: SelectedColumn.FREQUENCY,
      selectedColumnName: SelectedColumnName.FREQUENCY,
      selectedYaxis: Yaxis.BYBOTH,
      sampleText: '',
    };
    this.commGetYAxis = new CommAPI(
      'get_yaxis_values_comm_api',
      (msg: RequestResult) => {
        this.setSpecifications(msg['updated_data']);
        this.setState({
          processedData: msg['updated_data'],
          sortedFieldBy: SortedByOptions.BYBOTH,
          selectedColumn: SelectedColumn.FREQUENCY,
          selectedColumnName: SelectedColumnName.FREQUENCY,
        });
      }
    );
    this.commGetTextSample = new CommAPI(
      'get_text_comm_api',
      (msg: {text: string}) => {
        this.setState({sampleText: msg['text']});
      }
    );
    this.handleHover = this.handleHover.bind(this);
    this.onChangeSortedBy = this.onChangeSortedBy.bind(this);
    this.onChangeSelectedValue = this.onChangeSelectedValue.bind(this);
    this.handlers = {tooltip: this.handleHover};
  }
  componentDidMount() {
    const {hit} = this.props;
    this.setSpecifications(hit);
  }

  setSpecifications(hit: DataSample) {
    const wordData = {
      values: hit.words,
    };
    const keywordSpecification = {
      data: wordData,
      width: 80,
      height: 30,
      transform: [
        {calculate: 'datum.frequency', as: 'Value'},
        {calculate: 'datum.frequency', as: 'ValuePerCategory'},
        {
          joinaggregate: [
            {op: 'sum', field: 'ValuePerCategory', as: 'SortedField'},
          ],
          groupby: ['word'],
        },
        {
          calculate:
            "datum.category == 'negative' ? 'Negative' : 'Positive'",
          as: 'CategoryGroup',
        },
      ],
      mark: {
        type: 'bar',
        stroke: '#616161',
        cursor: 'pointer',
      },
      selection: {
        industry: {
          type: 'multi',
          fields: ['CategoryGroup'],
          bind: 'legend',
        },
        highlight: {type: 'single', empty: 'none', on: '*:mousedown'},
        select: {type: 'multi'},
      },
      encoding: {
        row: {
          field: 'word',
          type: 'ordinal',
          spacing: 0,
          align: 'all',
          header: {labelAngle: 0, labelAlign: 'left'},
          sort: {field: 'SortedField', order: 'descending'},
        },
        x: {
          field: 'Value',
          title: 'Frequency',
          type: 'quantitative',
          axis: {grid: false},
        },
        y: {
          field: 'category',
          axis: {title: '', labels: false},
          sort: {encoding: 'x'},
        },
        tooltip: {field: 'Value', type: 'quantitative'},
        color: {
          field: 'CategoryGroup',
          scale: {range: ['#dc3545', '#0277bd']},
          legend: {
            symbolStrokeWidth: 0,
          },
        },
        strokeWidth: {
          condition: [
            {
              test: {
                and: [{selection: 'select'}, 'length(data("select_store"))'],
              },
              value: 0.6,
            },
            {selection: 'highlight', value: 0.6},
          ],
          value: 0,
        },
        fillOpacity: {
          condition: {selection: 'select', value: 1},
          value: 0.3,
        },
        opacity: {
          condition: {selection: 'industry', value: 1},
          value: 0.2,
        },
      },
      config: {
        view: {stroke: 'transparent'},
      },
    };
    this.setVegaSpecification(JSON.stringify(keywordSpecification));
    const entityData = {
      values: hit.entities,
    };
    const entityTitles = ['Organization', 'Person', 'City or Country'];
    const entityNames = [
      "datum.entity_type == 'ORGANIZATION'",
      "datum.entity_type == 'PERSON'",
      "datum.entity_type == 'CITY/COUNTRY'",
    ];
    const entityPlots = [];
    for (let i = 0; i < entityNames.length; i++) {
      const entityPlot = {
        transform: [
          {filter: entityNames[i]},
          {calculate: 'datum.frequency', as: 'ValuePerCategory'},
          {
            joinaggregate: [
              {op: 'sum', field: 'ValuePerCategory', as: 'SortedField'},
            ],
            groupby: ['word'],
          },
        ],
        width: 80,
        height: 30,
        mark: {
          type: 'bar',
          stroke: '#616161',
          cursor: 'pointer',
        },
        selection: {
          industry: {
            type: 'multi',
            fields: ['CategoryGroup'],
            bind: 'legend',
          },
          highlight: {type: 'single', empty: 'none', on: '*:mousedown'},
          select: {type: 'multi'},
        },
        encoding: {
          row: {
            field: 'word',
            type: 'ordinal',
            spacing: 0,
            align: 'all',
            title: entityTitles[i],
            header: {labelAngle: 0, labelAlign: 'left'},
            sort: {field: 'SortedField', order: 'descending'},
          },
          x: {
            field: 'Value',
            title: 'Frequency',
            type: 'quantitative',
            axis: {grid: false},
          },
          y: {
            field: 'category',
            axis: {title: '', labels: false},
            sort: {encoding: 'x'},
          },
          tooltip: {field: 'Value', type: 'quantitative'},
          color: {
            field: 'CategoryGroup',
            scale: {range: ['#dc3545', '#0277bd']},
            legend: {
              symbolStrokeWidth: 0,
            },
          },
          strokeWidth: {
            condition: [
              {
                test: {
                  and: [{selection: 'select'}, 'length(data("select_store"))'],
                },
                value: 0.6,
              },
              {selection: 'highlight', value: 0.6},
            ],
            value: 0,
          },
          fillOpacity: {
            condition: {selection: 'select', value: 1},
            value: 0.3,
          },
          opacity: {
            condition: {selection: 'industry', value: 1},
            value: 0.2,
          },
        },
      };
      entityPlots.push(entityPlot);
    }

    const entitySpecification = {
      data: entityData,
      width: 200,
      transform: [
        {calculate: 'datum.frequency', as: 'Value'},
        {
          calculate:
            "datum.category == 'negative' ? 'Negative' : 'Positive'",
          as: 'CategoryGroup',
        },
      ],
      columns: 3,
      concat: entityPlots,
      config: {
        view: {stroke: 'transparent'},
      },
    };
    this.setVegaEntitySpecification(JSON.stringify(entitySpecification));
  }

  handleHover(...args: unknown[]) {
    const info = JSON.stringify(args[1]);
    this.setState({info: info});
    if (JSON.parse(info).samples) {
      this.getSampleText(JSON.parse(info).samples[0], JSON.parse(info).category);
    }
  }

  async setVegaSpecification(spec: string) {
    try {
      const result = compile(JSON.parse(spec) as VlSpec).spec;
      if (result && result.signals) {
        const addSignal = addSignalListener;
        result.signals.push(addSignal);
        this.setState({vegaliteSpec: spec, vegaSpec: result, info: '{}'});
      }
    } catch (e) {
      console.error('Unable to compile Vega Specification:', e);
    }
  }

  async setVegaEntitySpecification(spec: string) {
    try {
      const result = compile(JSON.parse(spec) as VlSpec).spec;
      if (result && result.signals) {
        const addSignal = addSignalListener;
        result.signals.push(addSignal);
        this.setState({
          vegaliteEntitySpec: spec,
          vegaEntitySpec: result,
          info: '{}',
        });
      }
    } catch (e) {
      console.error('Unable to compile Vega Specification:', e);
    }
  }

  onChangeSortedBy(value: string) {
    const modifiedSpec = JSON.parse(this.state.vegaliteSpec);
    const modifiedEntitySpec = JSON.parse(this.state.vegaliteEntitySpec);
    let sortedBy = '';
    switch (value) {
      case SortedByOptions.BYPOSITIVE:
        sortedBy =
          "datum.category == 'positive' ? datum." +
          this.state.selectedColumnName +
          ' : 0';
        break;
      case SortedByOptions.BYNEGATIVE:
        sortedBy =
          "datum.category == 'negative' ? datum." +
          this.state.selectedColumnName +
          ' : 0';
        break;
      case SortedByOptions.BYDIFFERENCE:
        sortedBy = 'datum.' + this.state.selectedColumnName + '_diff_pos_neg';
        break;
      default:
        sortedBy = 'datum.' + this.state.selectedColumnName;
    }
    modifiedSpec['transform'][1]['calculate'] = sortedBy;
    for (let i = 0; i < modifiedEntitySpec['concat'].length; i++) {
      modifiedEntitySpec['concat'][i]['transform'][1]['calculate'] = sortedBy;
    }
    this.setVegaSpecification(JSON.stringify(modifiedSpec));
    this.setVegaEntitySpecification(JSON.stringify(modifiedEntitySpec));
    this.setState({sortedFieldBy: value, info: '{}'});
  }

  updatePlotValues(columnName: string, xLabel: string) {
    const modifiedSpec = JSON.parse(this.state.vegaliteSpec);
    const modifiedEntitySpec = JSON.parse(this.state.vegaliteEntitySpec);
    modifiedSpec['encoding']['x']['title'] = xLabel;
    for (let i = 0; i < modifiedEntitySpec['concat'].length; i++) {
      modifiedEntitySpec['concat'][i]['encoding']['x']['title'] = xLabel;
    }
    modifiedSpec['transform'][0]['calculate'] = 'datum.' + columnName;
    modifiedEntitySpec['transform'][0]['calculate'] = 'datum.' + columnName;
    this.setVegaSpecification(JSON.stringify(modifiedSpec));
    this.setVegaEntitySpecification(JSON.stringify(modifiedEntitySpec));
    this.setState({
      selectedColumn: xLabel,
      selectedColumnName: columnName,
      info: '{}',
    });
  }
  onChangeSelectedValue(value: string) {
    switch (value) {
      case SelectedColumn.FREQUENCY:
        this.updatePlotValues(
          SelectedColumnName.FREQUENCY,
          SelectedColumn.FREQUENCY
        );
        break;
      case SelectedColumn.NORMALIZED_FREQUENCY:
        this.updatePlotValues(
          SelectedColumnName.NORMALIZED_FREQUENCY,
          SelectedColumn.NORMALIZED_FREQUENCY
        );
        break;
      default:
        this.updatePlotValues(
          SelectedColumnName.FREQUENCY,
          SelectedColumn.FREQUENCY
        );
    }
  }

  onChangeSelectedYAxis(value: string) {
    this.commGetYAxis.call({selected_yaxis: value});
    this.setState({selectedYaxis: value});
  }
  getSampleText(id: number, category: string) {
    this.commGetTextSample.call({id: id, category: category});
  }

  render() {
    const {processedData} = this.state;
    const wordData = {
      values: processedData.words,
    };
    const entityData = {
      values: processedData.entities,
    };

    return (
      <div className="mt-2">
        <div style={{textAlign: 'center', margin: 15}}>
          <h3>Text Analysis: Word Frenquecy and Entity Recognition</h3>
        </div>
        <div className="row">
          <div className="col-xs-4">
            <label className="marginlabel"> X axis </label>
            <select
              className="bootstrap-select badge badge-pill badge-primary"
              value={this.state.selectedYaxis}
              onChange={e => {
                this.onChangeSelectedYAxis(e.target.value);
              }}
            >
              {Object.values(Yaxis).map(unit => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
          <div className="col-xs-3">
            <label className="marginlabel"> Y axis </label>
            <select
              className="bootstrap-select badge badge-pill badge-primary"
              value={this.state.selectedColumn}
              onChange={e => {
                this.onChangeSelectedValue(e.target.value);
              }}
            >
              {Object.values(SelectedColumn).map(unit => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
          <div className="col-xs-4">
            <label className="marginlabel"> Sorted by </label>
            <select
              className="bootstrap-select badge badge-pill badge-primary  ml-2"
              value={this.state.sortedFieldBy}
              onChange={e => {
                this.onChangeSortedBy(e.target.value);
              }}
            >
              {Object.values(SortedByOptions).map(unit => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="accordion" id="accordionExample">
          <div className="card">
            <div
              className="card-header"
              id="headingOne"
              data-toggle="collapse"
              data-target="#collapseOne"
              aria-expanded="true"
              aria-controls="collapseOne"
            >
              <h2 className="mb-0">
                <button className="btn btn-link collapsed" type="button">
                  WORDS
                </button>
              </h2>
            </div>
            <div
              id="collapseOne"
              className="collapse"
              aria-labelledby="headingOne"
              data-parent="#accordionExample"
            >
              <div className="card-body">
                <Vega
                  data={wordData}
                  spec={this.state.vegaSpec}
                  signalListeners={this.handlers}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="accordion" id="accordionExample2">
          <div className="card">
            <div
              className="card-header"
              id="headingTwo"
              data-toggle="collapse"
              data-target="#collapseTwo"
              aria-expanded="true"
              aria-controls="collapseTwo"
            >
              <h2 className="mb-0">
                <button className="btn btn-link collapsed" type="button">
                  ENTITIES
                </button>
              </h2>
            </div>
            <div
              id="collapseTwo"
              className="collapse"
              aria-labelledby="headingTwo"
              data-parent="#accordionExample2"
            >
              <div className="card-body">
                <Vega
                  data={entityData}
                  spec={this.state.vegaEntitySpec}
                  signalListeners={this.handlers}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="accordion" id="accordionExample3">
          <div className="card">
            <div
              className="card-header"
              id="headingThree"
              data-toggle="collapse"
              aria-expanded="true"
            >
              <h4 className="mb-0" style={{padding: 8}}>
                {'Sample text for '}
                <u>
                  {JSON.parse(this.state.info).word &&
                    JSON.parse(this.state.info).samples &&
                    JSON.parse(this.state.info).word}
                </u>
              </h4>
            </div>
            <div
              id="collapseThree"
              className="collapse show"
              aria-labelledby="headingThree"
              data-parent="#accordionExample3"
            >
              <div
                className="card-body"
                style={{height: 150, overflowY: 'auto'}}
              >
                {JSON.parse(this.state.info).samples && (
                  <ReactMarkdown
                    source={this.state.sampleText.replace(
                      new RegExp(JSON.parse(this.state.info).word, 'gi'),
                      (match: string) => `<mark>${match}</mark>`
                    )}
                    escapeHtml={false}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export {WordEntityBarCharts};
