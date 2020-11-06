import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useAuth } from '../../hooks/auth';
import {
  Container,
  Header,
  BackButton,
  HeaderTitle,
  Content,
  UserAvatar,
  ProvidersListContainer,
  ProvidersList,
  ProviderContainer,
  ProviderAvatar,
  ProviderName,
  Calendar,
  Title,
  OpenDataPickerButton,
  OpenDataPickerButtonText,
  Schedule,
  Section,
  SectionTitle,
  SectionContent,
  Hour,
  HourText,
  CreateAppointmentButton,
  CreateAppointmentButtonText,
} from './styles';
import api from '../../services/api';
import { Platform, Alert } from 'react-native';

interface RouteParams {
  provider_id: string;
}

export interface Provider {
  id: string;
  name: string;
  avatar_url: string;
}

export interface IHoursAvailable {
  hour: number;
  available: boolean;
}

const CreateAppointment: React.FC = () => {
  const { user } = useAuth();
  const route = useRoute();
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const routeParams = route.params as RouteParams;
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedHour, setSelectedHour] = useState(0);
  const [hoursAvailable, setHoursAvailable] = useState<IHoursAvailable[]>([]);
  const [selectedProvider, setSelectedProvider] = useState(
    routeParams.provider_id,
  );
  const { goBack, navigate } = useNavigation();

  useEffect(() => {
    api.get<Provider[]>('providers').then(({ data }) => {
      setProviders(data);
    });
  }, []);

  useEffect(() => {
    api
      .get<IHoursAvailable[]>(
        `providers/${selectedProvider}/day-availability`,
        {
          params: {
            day: date.getDate(),
            year: date.getFullYear(),
            month: date.getMonth() + 1,
          },
        },
      )
      .then(({ data }) => {
        setHoursAvailable(data);
      });
  }, [date, selectedProvider]);

  const navigateBack = useCallback(() => {
    goBack();
  }, [goBack]);

  const handleSelectProvider = useCallback((provider_id: string) => {
    setSelectedProvider(provider_id);
  }, []);

  const handleToogleDatePicker = useCallback(() => {
    setShowDatePicker(current => !current);
  }, []);

  const handleDateChange = useCallback((event: any, date: Date | undefined) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (date) {
      setDate(date);
    }
  }, []);

  const handleSelectHour = useCallback((hour: number) => {
    setSelectedHour(hour);
  }, []);

  const handleCreateAppointment = useCallback(async () => {
    try {
      const dateAppointment = new Date(date);

      dateAppointment.setHours(selectedHour);
      dateAppointment.setMinutes(0);
      const dateFormatted = format(dateAppointment, 'yyyy-MM-dd HH:mm');

      await api.post('appointments', {
        provider_id: selectedProvider,
        date: dateFormatted,
      });

      navigate('AppointmentCreated', { date: dateAppointment.getTime() });
    } catch (error) {
      Alert.alert(
        'Erro ao criar agendamento',
        'Ocorreu um erro ao tentar criar o agendamento, tente novamente.',
      );
    }
  }, [selectedProvider]);

  const morningAvailability = useMemo(() => {
    return hoursAvailable
      .filter(({ hour }) => hour < 12)
      .map(({ hour, available }) => {
        return {
          hour,
          available,
          hourFormatted: format(date.setHours(hour), "HH':00'"),
        };
      });
  }, [hoursAvailable]);

  const afternoonAvailability = useMemo(() => {
    return hoursAvailable
      .filter(({ hour }) => hour >= 12 && hour < 18)
      .map(({ hour, available }) => {
        return {
          hour,
          available,
          hourFormatted: format(date.setHours(hour), "HH':00'"),
        };
      });
  }, [hoursAvailable]);

  const nightAvailability = useMemo(() => {
    return hoursAvailable
      .filter(({ hour }) => hour >= 18)
      .map(({ hour, available }) => {
        return {
          hour,
          available,
          hourFormatted: format(date.setHours(hour), "HH':00'"),
        };
      });
  }, [hoursAvailable]);

  return (
    <Container>
      <Header>
        <BackButton onPress={navigateBack}>
          <Icon name="chevron-left" size={24} color="#999591" />
        </BackButton>
        <HeaderTitle>Cabeleireiros</HeaderTitle>

        <UserAvatar source={{ uri: user.avatar_url }} />
      </Header>
      <Content>
        <ProvidersListContainer>
          <ProvidersList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={providers}
            keyExtractor={provider => provider.id}
            renderItem={({ item: provider }) => (
              <ProviderContainer
                onPress={() => handleSelectProvider(provider.id)}
                selected={selectedProvider === provider.id}
              >
                <ProviderAvatar source={{ uri: provider.avatar_url }} />
                <ProviderName selected={selectedProvider === provider.id}>
                  {provider.name}
                </ProviderName>
              </ProviderContainer>
            )}
          />
        </ProvidersListContainer>

        <Calendar>
          <Title>Escolha a data</Title>

          <OpenDataPickerButton onPress={handleToogleDatePicker}>
            <OpenDataPickerButtonText>
              Selecionar outra data
            </OpenDataPickerButtonText>
          </OpenDataPickerButton>

          {showDatePicker && (
            <DateTimePicker
              mode="date"
              display="calendar"
              // textColor="#f4ede8"
              value={date}
              onChange={handleDateChange}
            />
          )}
        </Calendar>

        <Schedule>
          <Title>Escolha o horário</Title>

          <Section>
            <SectionTitle>Manhã</SectionTitle>

            <SectionContent>
              {morningAvailability.map(({ hour, hourFormatted, available }) => {
                return (
                  <Hour
                    selected={selectedHour === hour}
                    key={hourFormatted}
                    available={available}
                    onPress={() => handleSelectHour(hour)}
                  >
                    <HourText selected={selectedHour === hour}>
                      {hourFormatted}
                    </HourText>
                  </Hour>
                );
              })}
            </SectionContent>
          </Section>

          <Section>
            <SectionTitle>Tarde</SectionTitle>
            <SectionContent>
              {afternoonAvailability.map(
                ({ hour, hourFormatted, available }) => {
                  return (
                    <Hour
                      selected={selectedHour === hour}
                      key={hourFormatted}
                      available={available}
                      onPress={() => handleSelectHour(hour)}
                    >
                      <HourText selected={selectedHour === hour}>
                        {hourFormatted}
                      </HourText>
                    </Hour>
                  );
                },
              )}
            </SectionContent>
          </Section>

          <Section>
            <SectionTitle>Noite</SectionTitle>
            <SectionContent>
              {nightAvailability.map(({ hour, hourFormatted, available }) => {
                return (
                  <Hour
                    selected={selectedHour === hour}
                    key={hourFormatted}
                    available={available}
                    onPress={() => handleSelectHour(hour)}
                  >
                    <HourText selected={selectedHour === hour}>
                      {hourFormatted}
                    </HourText>
                  </Hour>
                );
              })}
            </SectionContent>
          </Section>
        </Schedule>

        <CreateAppointmentButton onPress={handleCreateAppointment}>
          <CreateAppointmentButtonText>Agendar</CreateAppointmentButtonText>
        </CreateAppointmentButton>
      </Content>
    </Container>
  );
};

export default CreateAppointment;
