import { useTheme } from '../contexts/ThemeContext';
import Header from './Header';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
	const { theme } = useTheme();

	return (
		<div className={`flex h-screen overflow-hidden bg-background ${theme}`}>
			<Sidebar />
			<div className="flex-1 flex flex-col min-w-0">
				<Header />
				<main className="flex-1 p-6 bg-background overflow-auto">
					{/* Add padding-left on mobile to account for hamburger menu */}
					<div className="lg:pl-0 pl-12">{children}</div>
				</main>
			</div>
		</div>
	);
};

export default Layout;
