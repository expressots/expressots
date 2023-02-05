import React, { FC } from "react";
import { Text } from "ink";
import Gradient from "ink-gradient";
import BigText from "ink-big-text";

const App: FC<{ name?: string }> = ({ name = "Stranger" }) => (
	<>
		<Gradient name="morning">
			<BigText align="center" text="Expresso TS" />
		</Gradient>
		<Text>
			Hello, <Text color="green">{name}</Text>
		</Text>
	</>
);

module.exports = App;
export default App;
