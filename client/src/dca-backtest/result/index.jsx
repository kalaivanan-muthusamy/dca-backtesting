import { Tabs, Tab } from 'react-bootstrap'

function BacktestResults() {
  <Tabs
  defaultActiveKey="profile"
  id="fill-tab-example"
  className="mb-3"
  fill
>
  <Tab eventKey="home" title="Home">
    <h1> Test </h1>
  </Tab>
  <Tab eventKey="profile" title="Profile">
    <h1> Test </h1>
  </Tab>
  <Tab eventKey="longer-tab" title="Loooonger Tab">
    <h1> Test </h1>
  </Tab>
  <Tab eventKey="contact" title="Contact" disabled>
    <h1> Test </h1>
  </Tab>
</Tabs>
}

export default BacktestResults;