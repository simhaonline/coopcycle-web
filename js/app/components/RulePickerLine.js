import React from 'react'
import i18n from '../i18n'
import _ from 'lodash'
import isScalar from 'locutus/php/var/is_scalar'

/*

  A component to edit a rule which will be evaluated as Symfony's expression language.

  Variables :
    - pickup.address : L'adresse de retrait
    - dropoff.address : L'adresse de dépôt
    - distance : La distance entre le point de retrait et le point de dépôt
    - weight : Le poids du colis transporté en grammes
    - vehicle : Le type de véhicule (bike ou cargo_bike)

  Examples :
    * distance in 0..3000
    * weight > 1000
    * in_zone(pickup.address, "paris_est")
    * vehicle == "cargo_bike"
*/

const typeToOperators = {
  'distance': ['<', '>', 'in'],
  'weight': ['<', '>', 'in'],
  'vehicle': ['=='],
  'pickup.address': ['in_zone', 'out_zone'],
  'dropoff.address': ['in_zone', 'out_zone'],
  'diff_days(pickup)': ['==', '<', '>', 'in'],
  'diff_hours(pickup)': ['==', '<', '>'],
  'dropoff.doorstep': ['=='],
}

class RulePickerLine extends React.Component {

  constructor (props) {
    super(props)

    this.state = {
      type: props.type || '',         // the variable the rule is built upon
      operator: props.operator || '', // the operator/function used to build the rule
      value: isScalar(props.value) ? `${props.value}` : (props.value || ''),       // the value(s) which complete the rule
    }

    this.onTypeSelect = this.onTypeSelect.bind(this)
    this.onOperatorSelect = this.onOperatorSelect.bind(this)
    this.renderBoundPicker = this.renderBoundPicker.bind(this)
    this.handleFirstBoundChange = this.handleFirstBoundChange.bind(this)
    this.handleSecondBoundChange = this.handleSecondBoundChange.bind(this)
    this.handleValueChange = this.handleValueChange.bind(this)
    this.delete = this.delete.bind(this)
  }

  componentDidUpdate (prevProps, prevState) {
    if (!_.isEqual(this.state, prevState)) {
      this.props.onUpdate(this.props.index, {
        left: this.state.type,
        operator: this.state.operator,
        right: this.state.value
      })
    }
  }

  handleFirstBoundChange (ev) {
    let value = this.state.value.slice()
    value[0] = ev.target.value
    this.setState({ value })
  }

  handleSecondBoundChange (ev) {
    let value = this.state.value.slice()
    value[1] = ev.target.value
    this.setState({ value })
  }

  handleValueChange (ev) {
    const { value } = this.state
    if (!Array.isArray(value)) {
      this.setState({ value: ev.target.value })
    }
  }

  onTypeSelect (ev) {
    ev.preventDefault()
    let type = ev.target.value,
      operator = typeToOperators[type].length === 1 ? typeToOperators[type][0] : ''
    this.setState({
      type,
      operator,
      value: ''
    })
  }

  onOperatorSelect (ev) {

    ev.preventDefault()

    const operator = ev.target.value

    let state = { operator }

    if ('in' === operator) {
      state = {
        ...state,
        value: ['', '']
      }
    }

    if (_.includes(['==', '<', '>'], operator) && Array.isArray(this.state.value)) {
      state = {
        ...state,
        value: ''
      }
    }

    this.setState(state)
  }

  delete (evt) {
    evt.preventDefault()
    this.props.onDelete(this.props.index)
  }

  renderNumberInput() {
    return (
      <input className="form-control input-sm" value={this.state.value} onChange={this.handleValueChange} type="number" min="0" required></input>
    )
  }

  renderBooleanInput() {

    return (
      <select onChange={this.handleValueChange} value={this.state.value} className="form-control input-sm">
        <option value="false">No</option>
        <option value="true">Yes</option>
      </select>
    )
  }

  renderBoundPicker () {
    /*
     * Return the displayed input for bound selection
     */
    switch (this.state.operator) {
    // zone
    case 'in_zone':
    case 'out_zone':
      return (
        <select onChange={this.handleValueChange} value={this.state.value} className="form-control input-sm">
          <option value="">-</option>
          { this.props.zones.map((item, index) => {
            return (<option value={item} key={index}>{item}</option>)
          })}
        </select>
      )
    // vehicle, diff_days(pickup)
    case '==':
      if (this.state.type === 'diff_days(pickup)' || this.state.type === 'diff_hours(pickup)') {
        return this.renderNumberInput()
      }

      if (this.state.type === 'dropoff.doorstep') {
        return this.renderBooleanInput()
      }

      return (
        <select onChange={this.handleValueChange} value={this.state.value} className="form-control input-sm">
          <option value="">-</option>
          <option value="bike">Vélo</option>
          <option value="cargo_bike">Vélo Cargo</option>
        </select>
      )
    // weight, distance, diff_days(pickup)
    case 'in':
      return (
        <div className="row">
          <div className="col-md-6">
            <input className="form-control input-sm" value={this.state.value[0]} onChange={this.handleFirstBoundChange} type="number" min="0" required></input>
          </div>
          <div className="col-md-6">
            <input className="form-control input-sm" value={this.state.value[1]} onChange={this.handleSecondBoundChange} type="number" min="0" required></input>
          </div>
        </div>
      )
    case '<':
    case '>':
      return this.renderNumberInput()
    }
  }

  render () {

    return (
      <div className="row">
        <div className="col-md-3 form-group">
          <select value={this.state.type} onChange={this.onTypeSelect} className="form-control input-sm">
            <option value="">-</option>
            <option value="distance">{ i18n.t('RULE_PICKER_LINE_DISTANCE') }</option>
            <option value="weight">{ i18n.t('RULE_PICKER_LINE_WEIGHT') }</option>
            <option value="vehicle">{ i18n.t('RULE_PICKER_LINE_BIKE_TYPE') }</option>
            <option value="pickup.address">{ i18n.t('RULE_PICKER_LINE_PICKUP_ADDRESS') }</option>
            <option value="dropoff.address">{ i18n.t('RULE_PICKER_LINE_DROPOFF_ADDRESS') }</option>
            <option value="diff_hours(pickup)">{ i18n.t('RULE_PICKER_LINE_PICKUP_DIFF_HOURS') }</option>
            <option value="diff_days(pickup)">{ i18n.t('RULE_PICKER_LINE_PICKUP_DIFF_DAYS') }</option>
            <option value="dropoff.doorstep">{ i18n.t('RULE_PICKER_LINE_DROPOFF_DOORSTEP') }</option>
          </select>
        </div>
        <div className="col-md-3">
          {
            this.state.type && (
              <select value={this.state.operator} onChange={this.onOperatorSelect} className="form-control input-sm">
                <option value="">-</option>
                { typeToOperators[this.state.type].map(function(operator, index) {
                  return (<option key={index} value={operator}>{operator}</option>)
                })}
              </select>
            )
          }
        </div>
        <div className="col-md-5">
          {
            this.state.operator && this.renderBoundPicker()
          }
        </div>
        <div className="col-md-1" onClick={this.delete}>
          <a href="#"><i className="fa fa-trash"></i></a>
        </div>
      </div>
    )
  }
}


export default RulePickerLine
