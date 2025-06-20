export default function Header (){
	return (
		<header className="w-full bg-white shadow p-4 flex justify-between items-center">
			<nav className="md:flex gap-6 text-gray-600">
				<a href="#" className="hover:text-blue-600">Accueil</a>
				<a href="#" className="hover:text-blue-600">À propos</a>
				<a href="#" className="hover:text-blue-600">Contact</a>
			</nav>
		</header>
	)
}