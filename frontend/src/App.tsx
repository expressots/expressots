import React from "react";
import { Form } from "./components/Form";

function App() {
  return (
    <div className="bg-gradient-to-r flex  items-center justify-items-center  from-purple-400 via-pink-500 to-red-500 w-full h-full">
      <div className="flex  items-center max-w-md mx-auto  ">
        <Form />
      </div>
    </div>
  );
}

export default App;
