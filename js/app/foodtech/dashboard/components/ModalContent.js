import React from 'react'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'
import { parsePhoneNumberFromString } from 'libphonenumber-js'

import {
  setCurrentOrder,
  acceptOrder,
  refuseOrder,
  delayOrder,
  cancelOrder
} from '../redux/actions'

import OrderItems from './OrderItems'
import OrderTotal from './OrderTotal'
import OrderNumber from './OrderNumber'
import Timeline from './Timeline'
import Button from './Button'

class ModalContent extends React.Component {

  constructor(props) {
    super(props)
  }

  cancelOrder() {
    const { order } = this.props

    this.props.cancelOrder(order)
  }

  delayOrder() {
    const { order } = this.props

    this.props.delayOrder(order)
  }

  refuseOrder() {
    const { order } = this.props

    this.props.refuseOrder(order)
  }

  acceptOrder() {
    const { order } = this.props

    this.props.acceptOrder(order)
  }

  renderButtons() {
    const { loading, order } = this.props

    if (order.state === 'new') {
      return (
        <div className="d-flex flex-row justify-content-between py-4 border-top">
          <Button onClick={ this.refuseOrder.bind(this) } loading={ loading } icon="ban" danger>
            { this.props.t('ADMIN_DASHBOARD_ORDERS_REFUSE') }
          </Button>
          <Button onClick={ this.acceptOrder.bind(this) } loading={ loading } icon="check" primary>
            { this.props.t('ADMIN_DASHBOARD_ORDERS_ACCEPT') }
          </Button>
        </div>
      )
    }

    if (order.state === 'accepted') {
      return (
        <div className="d-flex flex-row justify-content-between py-4 border-top">
          <Button onClick={ this.cancelOrder.bind(this) } loading={ loading } icon="ban" danger>
            { this.props.t('ADMIN_DASHBOARD_ORDERS_CANCEL') }
          </Button>
          <Button onClick={ this.delayOrder.bind(this) } loading={ loading } icon="clock-o" primary>
            { this.props.t('ADMIN_DASHBOARD_ORDERS_DELAY') }
          </Button>
        </div>
      )
    }
  }

  renderNotes() {

    const { order } = this.props

    return (
      <div>
        <h5>
          <i className="fa fa-user"></i>  { this.props.t('ADMIN_DASHBOARD_ORDERS_NOTES') }
        </h5>
        <div className="speech-bubble">
          <i className="fa fa-quote-left"></i>  { order.notes }
        </div>
      </div>
    )
  }

  renderPhoneNumber(phoneNumberAsText) {

    const phoneNumber =
      parsePhoneNumberFromString(phoneNumberAsText, this.props.countryCode)

    return (
      <span>
        <span><i className="fa fa-phone"></i></span>
        <span> </span>
        <span><small>{ phoneNumber ? phoneNumber.formatNational() : phoneNumberAsText }</small></span>
      </span>
    )
  }

  renderCustomerDetails(customer) {

    const items = []

    if (customer.givenName && customer.familyName) {
      items.push({
        text: `${customer.givenName} ${customer.familyName}`
      })
    }

    if (customer.telephone) {
      items.push({
        component: this.renderPhoneNumber(customer.telephone)
      })
    }

    if (customer.email) {
      items.push({
        icon: 'envelope-o',
        component: (
          <a href={ `mailto:${customer.email}` }>
            <small>{ customer.email }</small>
          </a>
        )
      })
    }

    return (
      <ul className="list-unstyled">
        { items.map((item, key) => {

          return (
            <li key={ key }>
              { item.icon && (
                <span>
                  <span><i className={ `fa fa-${item.icon}` }></i></span>
                  <span> </span>
                </span>
              ) }
              { item.text && ( <span><small>{ item.text }</small></span> ) }
              { item.component && item.component }
            </li>
          )
        }) }
      </ul>
    )
  }

  render() {

    const { order } = this.props

    return (
      <div className="panel panel-default">
        <div className="panel-heading">
          <OrderNumber order={ order } />
          <a className="pull-right" onClick={ () => this.props.setCurrentOrder(null) }>
            <i className="fa fa-close"></i>
          </a>
        </div>
        <div className="panel-body">
          <div className="row">
            <div className="col-xs-6">
              <h5>
                <i className="fa fa-user"></i>  { order.customer.username }
              </h5>
            </div>
            <div className="col-xs-6">
              <div className="text-right">
                { this.renderCustomerDetails(order.customer) }
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-center">
              <i className="fa fa-cutlery"></i>  { order.restaurant.name }
            </h4>
            { order.restaurant.telephone && (
              <div className="text-center text-muted">
                { this.renderPhoneNumber(order.restaurant.telephone) }
              </div>
            ) }
          </div>
          <h5>{ this.props.t('ADMIN_DASHBOARD_ORDERS_DISHES') }</h5>
          <OrderItems order={ order } />
          <OrderTotal order={ order } />
          { order.notes && this.renderNotes() }
          <h5>{ this.props.t('ADMIN_DASHBOARD_ORDERS_TIMELINE') }</h5>
          <Timeline order={ order } />
          { this.renderButtons() }
        </div>
      </div>
    )
  }
}

function mapStateToProps(state) {

  return {
    countryCode: (window.AppData.countryIso || 'fr').toUpperCase(),
    loading: state.isFetching
  }
}

function mapDispatchToProps(dispatch) {
  return {
    setCurrentOrder: order => dispatch(setCurrentOrder(order)),
    acceptOrder: order => dispatch(acceptOrder(order)),
    refuseOrder: order => dispatch(refuseOrder(order)),
    delayOrder: order => dispatch(delayOrder(order)),
    cancelOrder: order => dispatch(cancelOrder(order)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(ModalContent))
