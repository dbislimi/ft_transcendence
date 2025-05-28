interface Props {
	name: string;
}

function InputBox({ name }: Props) {
	return (
		<>
			<label htmlFor={name}>Name</label>
			<input id="name" name={name} />
		</>
	);
}

export default InputBox;
