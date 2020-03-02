import React from "react";
import classNames from "classnames";
import "./NavFile.css";

class NavFile extends React.Component {
  constructor(props) {
    super(props);
    this.state = { childrenVisible: false };
  }

  render() {
    let openerButton;
    let handleClick;
    if (this.props.children.length > 0) {
      openerButton = this.state.childrenVisible ? "▼" : "▶";
      handleClick = () =>
        this.setState({ childrenVisible: !this.state.childrenVisible });
    }
    return (
      <div
        className={classNames({ row: this.props.level !== 0 })}
        style={{ marginLeft: 20 }}
      >
        <div
          onClick={handleClick}
          className={classNames("rowText", {
            childrenVisible: this.state.childrenVisible
          })}
        >
          <p className="dots">
            {this.props.level !== 0
              ? String.fromCharCode(183).repeat(4)
              : String.fromCharCode(160).repeat(3)}
          </p>
          {openerButton} {this.props.name}{" "}
          {this.props.bytes > 0 && `(${this.props.formattedBytes})`}
        </div>
        {this.state.childrenVisible && this.props.children}
      </div>
    );
  }
}

export default NavFile;
