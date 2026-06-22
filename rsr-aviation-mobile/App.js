import React, { useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import EmployeeDashboard from './src/screens/EmployeeDashboard';
import HRDashboard from './src/screens/HRDashboard';
import LeaveScreen from './src/screens/LeaveScreen';
import ExpenseScreen from './src/screens/ExpenseScreen';
import TripScreen from './src/screens/TripScreen';
import NoticeBoardScreen from './src/screens/NoticeBoardScreen';
import PayslipScreen from './src/screens/PayslipScreen';
import RegularizationScreen from './src/screens/RegularizationScreen';

// New screen imports
import ProfileScreen from './src/screens/ProfileScreen';
import DocumentScreen from './src/screens/DocumentScreen';
import HRReviewDocumentsScreen from './src/screens/HRReviewDocumentsScreen';
import DepartmentDashboardScreen from './src/screens/DepartmentDashboardScreen';
import TaskManagementScreen from './src/screens/TaskManagementScreen';
import ManagerControlsScreen from './src/screens/ManagerControlsScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';

// HR extensions
import HRUserDirectoryScreen from './src/screens/HRUserDirectoryScreen';
import HRManageUserProfileScreen from './src/screens/HRManageUserProfileScreen';
import HRRecruitmentScreen from './src/screens/HRRecruitmentScreen';
import HRUserEditScreen from './src/screens/HRUserEditScreen';

import { logout } from './src/api';

export default function App() {
  const [user, setUser] = useState(null); // { role: 'HR' | 'EMPLOYEE', username: string, firstName: string }
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [routeParams, setRouteParams] = useState(null);

  const handleLoginSuccess = (userPayload) => {
    setUser(userPayload);
    setCurrentScreen('dashboard');
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setCurrentScreen('dashboard');
    setRouteParams(null);
  };

  const handleNavigate = (screenName, params = null) => {
    setRouteParams(params);
    setCurrentScreen(screenName);
  };

  const handleBack = () => {
    // If we are on sub-screens like manager-controls, go back to department dashboard, otherwise back to home dashboard
    if (currentScreen === 'manager-controls') {
      setCurrentScreen('department');
    } else if (currentScreen === 'task-management') {
      setCurrentScreen('department');
    } else if (currentScreen === 'hr-manage-profile') {
      setCurrentScreen('hr-users');
    } else if (currentScreen === 'hr-user-edit') {
      setCurrentScreen('hr-users');
    } else {
      setCurrentScreen('dashboard');
    }
  };

  // Render navigation flows based on login state
  const renderScreen = () => {
    if (!user) {
      return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
    }

    if (user.role === 'HR') {
      switch (currentScreen) {
        case 'dashboard':
          return (
            <HRDashboard
              user={user}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
            />
          );
        case 'leaves':
          return <LeaveScreen user={user} onBack={handleBack} />;
        case 'expenses':
          return <ExpenseScreen user={user} onBack={handleBack} />;
        case 'trips':
          return <TripScreen user={user} onBack={handleBack} />;
        case 'notice-board':
          return <NoticeBoardScreen user={user} onBack={handleBack} />;
        case 'payslips':
          return <PayslipScreen user={user} onBack={handleBack} />;
        case 'regularization':
          return <RegularizationScreen user={user} onBack={handleBack} />;
        case 'profile':
          return <ProfileScreen user={user} onBack={handleBack} />;
        case 'hr-review-documents':
          return <HRReviewDocumentsScreen user={user} onBack={handleBack} />;
        case 'department':
          return <DepartmentDashboardScreen user={user} onNavigate={handleNavigate} onBack={handleBack} />;
        case 'manager-controls':
          return <ManagerControlsScreen user={user} onBack={handleBack} />;
        case 'attendance':
          return <AttendanceScreen user={user} onBack={handleBack} />;
        case 'hr-users':
          return <HRUserDirectoryScreen user={user} onNavigate={handleNavigate} onBack={handleBack} />;
        case 'hr-manage-profile':
          return <HRManageUserProfileScreen user={user} routeParams={routeParams} onBack={handleBack} />;
        case 'hr-recruitment':
          return <HRRecruitmentScreen user={user} onBack={handleBack} />;
        case 'hr-user-edit':
          return <HRUserEditScreen user={user} routeParams={routeParams} onBack={handleBack} />;
        default:
          return (
            <HRDashboard
              user={user}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
            />
          );
      }
    } else {
      // EMPLOYEE SCREEN FLOWS
      switch (currentScreen) {
        case 'dashboard':
          return (
            <EmployeeDashboard
              user={user}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
            />
          );
        case 'leaves':
          return <LeaveScreen user={user} onBack={handleBack} />;
        case 'expenses':
          return <ExpenseScreen user={user} onBack={handleBack} />;
        case 'trips':
          return <TripScreen user={user} onBack={handleBack} />;
        case 'notice-board':
          return <NoticeBoardScreen user={user} onBack={handleBack} />;
        case 'payslips':
          return <PayslipScreen user={user} onBack={handleBack} />;
        case 'regularization':
          return <RegularizationScreen user={user} onBack={handleBack} />;
        case 'profile':
          return <ProfileScreen user={user} onBack={handleBack} />;
        case 'documents':
          return <DocumentScreen user={user} onBack={handleBack} />;
        case 'department':
          return <DepartmentDashboardScreen user={user} onNavigate={handleNavigate} onBack={handleBack} />;
        case 'task-management':
          return <TaskManagementScreen user={user} onBack={handleBack} routeParams={routeParams} />;
        case 'attendance':
          return <AttendanceScreen user={user} onBack={handleBack} />;
        default:
          return (
            <EmployeeDashboard
              user={user}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
            />
          );
      }
    }
  };

  return (
    <View style={styles.appContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#003366" />
      {renderScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#003366',
  },
});
