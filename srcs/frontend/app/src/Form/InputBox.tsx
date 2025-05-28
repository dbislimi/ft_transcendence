interface Props {
	msg: string;
}

function InputBox({msg}: Props) {
	return <input 
				type="text"
				id="name"
				name={msg}
				/>;
}

export default InputBox;
