import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

class App extends Component {
  render() {
    return (
      <div className="App">
        <a href={ process.env.REACT_APP_LOGIN }>
          <button>Login</button>
        </a>
      </div>
    );
  }
}

export default App;
