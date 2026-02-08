/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Academy from './pages/Academy';
import AdminUtils from './pages/AdminUtils';
import CommandCenter from './pages/CommandCenter';
import Dashboard from './pages/Dashboard';
import FinanceHub from './pages/FinanceHub';
import FinancialCore from './pages/FinancialCore';
import Home from './pages/Home';
import Integrations from './pages/Integrations';
import Leaderboard from './pages/Leaderboard';
import Missions from './pages/Missions';
import NetWorth from './pages/NetWorth';
import Onboarding from './pages/Onboarding';
import PlayerProfile from './pages/PlayerProfile';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import ShieldControl from './pages/ShieldControl';
import Shop from './pages/Shop';
import Tools from './pages/Tools';
import Vault from './pages/Vault';
import Community from './pages/Community';
import Inventory from './pages/Inventory';
import BattleArena from './pages/BattleArena';
import Login from './pages/Login';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Academy": Academy,
    "AdminUtils": AdminUtils,
    "CommandCenter": CommandCenter,
    "Dashboard": Dashboard,
    "FinanceHub": FinanceHub,
    "FinancialCore": FinancialCore,
    "Home": Home,
    "Integrations": Integrations,
    "Leaderboard": Leaderboard,
    "Missions": Missions,
    "NetWorth": NetWorth,
    "Onboarding": Onboarding,
    "PlayerProfile": PlayerProfile,
    "Profile": Profile,
    "Reports": Reports,
    "ShieldControl": ShieldControl,
    "Shop": Shop,
    "Tools": Tools,
    "Vault": Vault,
    "Community": Community,
    "Inventory": Inventory,
    "BattleArena": BattleArena,
    "Login": Login,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};