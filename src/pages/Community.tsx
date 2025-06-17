import React, { useState } from 'react';
import { ArrowLeft, Users, Calendar, MapPin, Shield, Bell, ChevronRight, Star, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const Community = () => {
  const [activeTab, setActiveTab] = useState('groups');

  const communityGroups = [
    {
      id: 1,
      name: 'Extension 8 Watch',
      members: 45,
      area: 'Extension 8',
      leader: 'Community Captain',
      activity: 'Active patrol',
      nextMeeting: 'Tonight 7 PM',
      rating: 4.8,
    },
    {
      id: 2,
      name: 'School Safety Squad',
      members: 23,
      area: 'Around Schools',
      leader: 'Parent Committee',
      activity: 'Morning & afternoon',
      nextMeeting: 'Fri 6 PM',
      rating: 4.9,
    },
    {
      id: 3,
      name: 'Shopping Centre Guard',
      members: 18,
      area: 'Shopping District',
      leader: 'Business Owners',
      activity: 'Weekend patrol',
      nextMeeting: 'Sat 10 AM',
      rating: 4.6,
    },
  ];

  const upcomingEvents = [
    {
      id: 1,
      title: 'Community Safety Meeting',
      date: 'Tonight',
      time: '7:00 PM',
      location: 'Extension 8 Community Hall',
      attendees: 23,
      type: 'meeting',
    },
    {
      id: 2,
      title: 'Neighborhood Patrol',
      date: 'Tomorrow',
      time: '6:00 PM',
      location: 'Meet at Klipriver Road',
      attendees: 12,
      type: 'patrol',
    },
    {
      id: 3,
      title: 'Safety Workshop',
      date: 'Saturday',
      time: '10:00 AM',
      location: 'Community Center',
      attendees: 45,
      type: 'workshop',
    },
  ];

  const achievements = [
    { title: 'First Report', description: 'Submit your first incident report', earned: true },
    { title: 'Community Helper', description: 'Verify 5 incident reports', earned: true },
    { title: 'Safety Champion', description: 'Active for 30 days', earned: false },
    { title: 'Patrol Leader', description: 'Lead a community patrol', earned: false },
  ];

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'meeting':
        return '🏛️';
      case 'patrol':
        return '🚶';
      case 'workshop':
        return '📚';
      default:
        return '📅';
    }
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="flex items-center space-x-4">
          <Link to="/" className="p-2 hover:bg-blue-500 rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Community Hub</h1>
            <p className="text-blue-100 text-sm">Connect with your neighbors</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-6 mt-6">
        <div className="bg-gray-100 p-1 rounded-lg grid grid-cols-3 gap-1">
          {[
            { id: 'groups', label: 'Groups', icon: Users },
            { id: 'events', label: 'Events', icon: Calendar },
            { id: 'rewards', label: 'Rewards', icon: Star },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-6 mt-6">
        {activeTab === 'groups' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Active Groups</h2>
              <button className="text-blue-600 text-sm font-medium hover:text-blue-800 transition-colors">
                Join Group +
              </button>
            </div>

            <div className="space-y-4">
              {communityGroups.map((group) => (
                <div key={group.id} className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{group.name}</h3>
                      <p className="text-gray-600 text-sm">{group.area}</p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium text-gray-900">{group.rating}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-gray-500 text-sm">Members</p>
                      <p className="font-semibold text-gray-900">{group.members}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Leader</p>
                      <p className="font-semibold text-gray-900">{group.leader}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-700 font-medium">{group.activity}</span>
                    </div>
                    <button className="flex items-center space-x-1 text-blue-600 text-sm font-medium hover:text-blue-800 transition-colors">
                      <span>View Details</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="text-blue-800 text-sm font-medium">Next Meeting: {group.nextMeeting}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
              <button className="text-blue-600 text-sm font-medium hover:text-blue-800 transition-colors">
                Create Event +
              </button>
            </div>

            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="bg-white p-6 rounded-xl shadow-sm border">
                  <div className="flex items-start space-x-4">
                    <div className="text-3xl">{getEventIcon(event.type)}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{event.title}</h3>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{event.date} at {event.time}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{event.location}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Users className="w-4 h-4" />
                          <span>{event.attendees} attending</span>
                        </div>
                      </div>
                      <button className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                        Join Event
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'rewards' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Community Achievements</h2>
              <p className="text-gray-600 text-sm">Earn badges by participating in community safety</p>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl border border-green-200">
              <div className="flex items-center space-x-4">
                <div className="bg-green-500 rounded-full p-3">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Safety Score</h3>
                  <p className="text-2xl font-bold text-green-600">750 points</p>
                  <p className="text-sm text-gray-600">Community Contributor Level</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {achievements.map((achievement, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border ${
                    achievement.earned
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      achievement.earned ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      {achievement.earned ? (
                        <Star className="w-5 h-5 text-white" />
                      ) : (
                        <Star className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-medium ${
                        achievement.earned ? 'text-green-900' : 'text-gray-700'
                      }`}>
                        {achievement.title}
                      </h3>
                      <p className={`text-sm ${
                        achievement.earned ? 'text-green-700' : 'text-gray-500'
                      }`}>
                        {achievement.description}
                      </p>
                    </div>
                    {achievement.earned && (
                      <div className="text-green-600 text-sm font-medium">
                        Earned!
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Community;