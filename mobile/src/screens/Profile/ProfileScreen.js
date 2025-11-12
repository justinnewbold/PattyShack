import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, List, Divider, Button, Avatar } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            await logout();
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar.Text
          size={80}
          label={user?.username?.substring(0, 2).toUpperCase() || 'U'}
          style={styles.avatar}
        />
        <Text variant="headlineSmall" style={styles.name}>
          {user?.firstName && user?.lastName
            ? `${user.firstName} ${user.lastName}`
            : user?.username}
        </Text>
        <Text variant="bodyMedium" style={styles.email}>
          {user?.email}
        </Text>
        <Text variant="bodySmall" style={styles.role}>
          {user?.role?.toUpperCase()}
        </Text>
      </View>

      <List.Section>
        <List.Subheader>Account</List.Subheader>
        <List.Item
          title="Username"
          description={user?.username}
          left={(props) => <List.Icon {...props} icon="account" />}
        />
        <List.Item
          title="Email"
          description={user?.email}
          left={(props) => <List.Icon {...props} icon="email" />}
        />
        {user?.phone && (
          <List.Item
            title="Phone"
            description={user.phone}
            left={(props) => <List.Icon {...props} icon="phone" />}
          />
        )}
        {user?.location_id && (
          <List.Item
            title="Location"
            description={user.location_id}
            left={(props) => <List.Icon {...props} icon="map-marker" />}
          />
        )}
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>App</List.Subheader>
        <List.Item
          title="Schedules"
          left={(props) => <List.Icon {...props} icon="calendar" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Schedules')}
        />
        <List.Item
          title="Settings"
          left={(props) => <List.Icon {...props} icon="cog" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
        />
        <List.Item
          title="Help & Support"
          left={(props) => <List.Icon {...props} icon="help-circle" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
        />
        <List.Item
          title="About"
          description="Version 1.0.0"
          left={(props) => <List.Icon {...props} icon="information" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
        />
      </List.Section>

      <Divider />

      <View style={styles.logoutContainer}>
        <Button
          mode="contained"
          onPress={handleLogout}
          icon="logout"
          style={styles.logoutButton}
          buttonColor="#EF4444"
        >
          Logout
        </Button>
      </View>

      <Text variant="bodySmall" style={styles.footer}>
        PattyShack Mobile v1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    padding: 32,
    paddingTop: 80,
    backgroundColor: '#FF6B35',
  },
  avatar: {
    backgroundColor: '#fff',
  },
  name: {
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 16,
  },
  email: {
    color: '#fff',
    marginTop: 4,
  },
  role: {
    color: '#fff',
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  logoutContainer: {
    padding: 20,
    marginTop: 20,
  },
  logoutButton: {
    paddingVertical: 6,
  },
  footer: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
});
