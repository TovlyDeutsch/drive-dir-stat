import React from 'react';

class NavFile extends React.Component {
  constructor(props) {
    super(props)
    this.state = {bytes: null, childrenVisible: false}
  }

  render() { 
    let openerButton = null;
    let handleClick = null;
    if (this.props.children.length > 0) {
      openerButton = this.state.childrenVisible ? '▼' : '▶'
      handleClick = () => this.setState({childrenVisible: !this.state.childrenVisible})
    }
    return (<div>
      <p onClick={handleClick}>
        {/* TODO make/get bytes, kb, mb, gb formatter */}
        {openerButton} {this.props.name} {`(${this.state.bytes / 1000})`}
        </p>
      {this.state.childrenVisible && this.props.children}
      </div>)
  }
}

export default NavFile